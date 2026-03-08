import { useCallback, useRef, useState } from 'react'

import { apiClient } from '../utils/api'
import { buildWorkflowJSON, getWorkflowDiagnostics } from '../utils/workflow'

export function useWorkflowEngine({ nodes, edges, resolveApiUrl, t, showModal }) {
  const [pipelineStatus, setPipelineStatus] = useState(() => t('status_ready'))
  const [outputUrls, setOutputUrls] = useState(null)
  const [nodeOutputs, setNodeOutputs] = useState({})
  const [isRunning, setIsRunning] = useState(false)
  const [activeNodeId, setActiveNodeId] = useState(null)
  const [activeEdgeIds, setActiveEdgeIds] = useState(new Set())
  const runSequenceRef = useRef([])

  const resetOutputs = useCallback(() => {
    setOutputUrls(null)
    setNodeOutputs({})
  }, [])

  const computeTopoOrder = useCallback((graphNodes, graphEdges) => {
    const nodeIds = graphNodes.map((node) => node.id)
    const indegree = new Map(nodeIds.map((id) => [id, 0]))
    const adj = new Map(nodeIds.map((id) => [id, []]))
    graphEdges.forEach((edge) => {
      if (adj.has(edge.source) && adj.has(edge.target)) {
        adj.get(edge.source).push(edge.target)
        indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1)
      }
    })
    const queue = nodeIds.filter((id) => (indegree.get(id) || 0) === 0)
    const order = []
    while (queue.length) {
      const id = queue.shift()
      order.push(id)
      adj.get(id).forEach((next) => {
        indegree.set(next, (indegree.get(next) || 0) - 1)
        if (indegree.get(next) === 0) queue.push(next)
      })
    }
    return order
  }, [])

  const buildReachableSubgraph = useCallback(
    (startId) => {
      if (!startId) return { nodes, edges }
      const nodeIds = new Set(nodes.map((node) => node.id))
      const adjacency = new Map(nodes.map((node) => [node.id, []]))
      edges.forEach((edge) => {
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
          adjacency.get(edge.source).push(edge.target)
        }
      })
      const visited = new Set()
      const queue = [startId]
      while (queue.length) {
        const current = queue.shift()
        if (!current || visited.has(current)) continue
        visited.add(current)
        adjacency.get(current)?.forEach((next) => {
          if (!visited.has(next)) queue.push(next)
        })
      }
      return {
        nodes: nodes.filter((node) => visited.has(node.id)),
        edges: edges.filter((edge) => visited.has(edge.source) && visited.has(edge.target)),
      }
    },
    [edges, nodes]
  )

  const clearRunSequence = useCallback(() => {
    runSequenceRef.current.forEach((timer) => clearTimeout(timer))
    runSequenceRef.current = []
    setActiveNodeId(null)
    setActiveEdgeIds(new Set())
  }, [])

  const startRunSequence = useCallback(
    (graphNodes, graphEdges) => {
      clearRunSequence()
      const order = computeTopoOrder(graphNodes, graphEdges)
      if (!order.length) return
      order.forEach((nodeId, index) => {
        const timer = setTimeout(() => {
          setActiveNodeId(nodeId)
          const prev = order[index - 1]
          if (prev) {
            const edgeIds = graphEdges
              .filter((edge) => edge.source === prev && edge.target === nodeId)
              .map((edge) => edge.id)
              .filter(Boolean)
            setActiveEdgeIds(new Set(edgeIds))
          } else {
            setActiveEdgeIds(new Set())
          }
          const nodeType = graphNodes.find((node) => node.id === nodeId)?.type
          const statusMap = {
            input: 'processing_audio',
            denoise: 'processing_denoise',
            separation: 'processing_separation',
            custom_model: 'processing_custom_model',
            mixer: 'processing_mixer',
            export: 'processing_export',
          }
          if (nodeType && statusMap[nodeType]) {
            setPipelineStatus(t(statusMap[nodeType]))
          }
        }, index * 700)
        runSequenceRef.current.push(timer)
      })
    },
    [clearRunSequence, computeTopoOrder, t]
  )

  const runPipeline = useCallback(
    async (options = {}) => {
      const { targetNodeId, workflowNodes, workflowEdges, inputNodeId } = options
      const graphNodes = workflowNodes || nodes
      const graphEdges = workflowEdges || edges
      const workflowPayload = buildWorkflowJSON(graphNodes, graphEdges)

      setIsRunning(true)
      resetOutputs()

      const diagnostics = getWorkflowDiagnostics(graphNodes, graphEdges)
      if (diagnostics.errors.length > 0) {
        setPipelineStatus(t(diagnostics.errors[0]))
        setIsRunning(false)
        return
      }
      const warning = diagnostics.warnings[0]
      setPipelineStatus(
        warning ? t('status_running_warn', { warning: t(warning) }) : t('status_running')
      )

      const inputNode = inputNodeId
        ? nodes.find((node) => node.id === inputNodeId)
        : nodes.find((node) => node.type === 'input')
      const sourceType = inputNode?.data?.sourceType || 'upload'
      const file = inputNode?.data?.file
      if (sourceType === 'mic') {
        setPipelineStatus(t('error_mic_realtime'))
        setIsRunning(false)
        return
      }
      if (!file) {
        setPipelineStatus(t('error_no_file'))
        showModal(t('popup_no_audio_title'), t('popup_no_audio_body'))
        setIsRunning(false)
        return
      }

      startRunSequence(graphNodes, graphEdges)

      try {
        const perfStart = performance.now()
        const formData = new FormData()
        formData.append('workflow', JSON.stringify(workflowPayload))
        if (targetNodeId) {
          formData.append('target_node_id', targetNodeId)
        }
        formData.append('audio', file)
        const response = await apiClient.post('/api/run_pipeline', formData)
        const perfEnd = performance.now()
        // eslint-disable-next-line no-console
        console.log(
          `[perf] audio processing latency ${Math.round((perfEnd - perfStart) * 100) / 100}ms`
        )
        const rawOutputs = response.data.outputs || null
        const resolvedOutputs = rawOutputs
          ? Object.fromEntries(
              Object.entries(rawOutputs).map(([key, value]) => [key, resolveApiUrl(value)])
            )
          : null
        const rawNodeOutputs = response.data.node_outputs || {}
        const resolvedNodeOutputs = {}
        Object.entries(rawNodeOutputs).forEach(([nodeId, payload]) => {
          const mapped = {}
          Object.entries(payload || {}).forEach(([key, value]) => {
            mapped[key] = resolveApiUrl(value)
          })
          resolvedNodeOutputs[nodeId] = mapped
        })
        setOutputUrls(resolvedOutputs)
        setNodeOutputs(resolvedNodeOutputs)
        setPipelineStatus(t('status_complete'))
        showModal(t('popup_success_title'), t('popup_success_body'))
        setIsRunning(false)
        clearRunSequence()
      } catch (error) {
        const backendError = error?.response?.data?.error
        const readableError = backendError || error.message
        setPipelineStatus(t('status_failed', { error: readableError }))
        showModal(t('popup_fail_title'), readableError || t('popup_fail_body'))
        setIsRunning(false)
        clearRunSequence()
      }
    },
    [clearRunSequence, edges, nodes, resolveApiUrl, resetOutputs, showModal, startRunSequence, t]
  )

  const runFromInputNode = useCallback(
    (nodeId) => {
      const subgraph = buildReachableSubgraph(nodeId)
      runPipeline({
        workflowNodes: subgraph.nodes,
        workflowEdges: subgraph.edges,
        inputNodeId: nodeId,
      })
    },
    [buildReachableSubgraph, runPipeline]
  )

  const runPipelineToNode = useCallback(
    (nodeId) => {
      if (!nodeId) return
      runPipeline({ targetNodeId: nodeId })
    },
    [runPipeline]
  )

  return {
    pipelineStatus,
    setPipelineStatus,
    outputUrls,
    nodeOutputs,
    isRunning,
    activeNodeId,
    activeEdgeIds,
    runPipeline,
    runPipelineToNode,
    runFromInputNode,
    resetOutputs,
  }
}
