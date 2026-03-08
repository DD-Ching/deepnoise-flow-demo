import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import 'reactflow/dist/style.css'
import FloatingAudioPanel from './components/FloatingAudioPanel'
import FloatingOutputPanel from './components/FloatingOutputPanel'
import PanelErrorBoundary from './components/PanelErrorBoundary'
import TopBar from './components/Layout/TopBar'
import LeftSidebar from './components/Layout/LeftSidebar'
import RightSidebar from './components/Layout/RightSidebar'
import StatusBar from './components/Layout/StatusBar'
import { nodeTypes } from './nodes'
import { useWorkflowStorage } from './hooks/useWorkflowStorage'
import { useRealtimeAudio } from './hooks/useRealtimeAudio'
import { useI18n } from './hooks/useI18n'
import { useAudioCache } from './hooks/useAudioCache'
import { usePanels } from './hooks/usePanels'
import { useWorkflowEngine } from './hooks/useWorkflowEngine'
import { WorkflowUIContext } from './contexts/WorkflowUIContext'
import { buildWorkflowJSON } from './utils/workflow'
import { apiClient } from './utils/api'

const initialNodes = [
  {
    id: 'input-1',
    type: 'input',
    position: { x: 0, y: 40 },
    data: {
      sourceType: 'upload',
      file: null,
      enabled: true,
      sampleRate: 48000,
      channels: 1,
      device: 'default',
    },
  },
  {
    id: 'denoise-1',
    type: 'denoise',
    position: { x: 260, y: 40 },
    data: { model: 'deepfilternet', attenuation: 12, preset: 'medium', enabled: true },
  },
  {
    id: 'export-1',
    type: 'export',
    position: { x: 520, y: 40 },
    data: { format: 'wav', bitrate: 192, normalize: true, enabled: true },
  },
]

const initialEdges = [
  { id: 'e1-2', source: 'input-1', target: 'denoise-1' },
  { id: 'e2-3', source: 'denoise-1', target: 'export-1' },
]

function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  onSelect,
  onNodeContextMenu,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onMove,
  children,
  wrapperRef,
}) {
  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full rounded-2xl border border-slate-800 bg-slate-950"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelect}
        onNodeContextMenu={onNodeContextMenu}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMove={onMove}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background color="#1f2937" gap={18} />
        <MiniMap pannable zoomable className="!bg-slate-950" />
        <Controls className="!bg-slate-900 !border-slate-800" />
      </ReactFlow>
      {children}
    </div>
  )
}

function FlowBuilder() {
  const reactFlowWrapper = useRef(null)
  const { project, getViewport, getNode } = useReactFlow()
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set())
  const [selectedEdgeIds, setSelectedEdgeIds] = useState(new Set())
  const [workflowName, setWorkflowName] = useState('')
  const { lang, setLang, t } = useI18n('zh')
  const [contextMenu, setContextMenu] = useState(null)
  const [modal, setModal] = useState(null)
  const [recordingElapsed, setRecordingElapsed] = useState(0)
  const [recordingStatus, setRecordingStatus] = useState('idle')
  const [recordingNodeId, setRecordingNodeId] = useState(null)
  const [viewport, setViewport] = useState(() => getViewport())
  const [recordingStream, setRecordingStream] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsError, setModelsError] = useState('')
  const { workflows, save, remove } = useWorkflowStorage()
  const {
    enabled: realtimeEnabled,
    status: realtimeStatus,
    start: startRealtime,
    stop: stopRealtime,
  } = useRealtimeAudio()

  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const historyLockedRef = useRef(false)
  const snapshotKeyRef = useRef('')
  const previewUrlsRef = useRef(new Map())
  const recordingTimerRef = useRef(null)
  const allowNodeRemovalRef = useRef(false)
  const allowEdgeRemovalRef = useRef(false)

  const onNodesChange = useCallback(
    (changes) => {
      const safeChanges = allowNodeRemovalRef.current
        ? changes
        : changes.filter((change) => change.type !== 'remove')
      allowNodeRemovalRef.current = false
      onNodesChangeInternal(safeChanges)
    },
    [onNodesChangeInternal]
  )

  const onEdgesChange = useCallback(
    (changes) => {
      const safeChanges = allowEdgeRemovalRef.current
        ? changes
        : changes.filter((change) => change.type !== 'remove')
      allowEdgeRemovalRef.current = false
      onEdgesChangeInternal(safeChanges)
    },
    [onEdgesChangeInternal]
  )

  const serializedWorkflow = useMemo(() => buildWorkflowJSON(nodes, edges), [nodes, edges])

  const createNodeId = useCallback((type) => {
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    return `${type}-${uniqueId}`
  }, [])

  const getAudioDuration = useCallback((file) => {
    if (!file) return Promise.resolve(null)
    return new Promise((resolve) => {
      const audio = new Audio()
      const url = URL.createObjectURL(file)
      const cleanup = () => URL.revokeObjectURL(url)
      audio.preload = 'metadata'
      audio.src = url
      audio.onloadedmetadata = () => {
        cleanup()
        resolve(audio.duration)
      }
      audio.onerror = () => {
        cleanup()
        resolve(null)
      }
    })
  }, [])

  const showModal = useCallback((title, body) => {
    setModal({ title, body })
  }, [])

  const updateNodeData = useCallback(
    (id, data) => {
      setNodes((nds) =>
        nds.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node))
      )
    },
    [setNodes]
  )

  const resolveApiUrl = useCallback((url) => {
    if (!url) return url
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const base = import.meta.env.VITE_API_BASE_URL || ''
    return base ? `${base}${url}` : url
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadModels = async () => {
      setModelsLoading(true)
      setModelsError('')
      try {
        const response = await apiClient.get('/api/models')
        const models = Array.isArray(response?.data?.models)
          ? response.data.models.filter((name) => typeof name === 'string' && name.trim())
          : []
        if (!cancelled) {
          setAvailableModels(models)
        }
      } catch (error) {
        if (!cancelled) {
          setAvailableModels([])
          setModelsError(error?.response?.data?.error || error?.message || 'Model registry unavailable.')
        }
      } finally {
        if (!cancelled) {
          setModelsLoading(false)
        }
      }
    }

    loadModels()
    return () => {
      cancelled = true
    }
  }, [])

  const {
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
  } = useWorkflowEngine({
    nodes,
    edges,
    resolveApiUrl,
    t,
    showModal,
  })

  const { getCachedUrl, downloadAudio, clearAudioCache } = useAudioCache({
    resolveApiUrl,
    t,
    showModal,
    outputUrls,
    nodeOutputs,
  })

  const { setOpenPanelIds, openPanel, openPanelNodes, getPanelPosition } = usePanels({
    nodes,
    getNode,
    wrapperRef: reactFlowWrapper,
    viewport,
  })

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        className: [
          node.data?.enabled === false ? 'node-disabled' : '',
          activeNodeId === node.id ? 'node-active' : '',
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [activeNodeId, nodes]
  )

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        animated: isRunning,
        className: [
          isRunning ? 'edge-animated' : '',
          activeEdgeIds.has(edge.id) ? 'edge-active' : '',
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [activeEdgeIds, edges, isRunning]
  )


  const setInputPreviewUrl = useCallback(
    (nodeId, file) => {
      if (!file) return null
      const map = previewUrlsRef.current
      const previousUrl = map.get(nodeId)
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      const url = URL.createObjectURL(file)
      map.set(nodeId, url)
      updateNodeData(nodeId, { previewUrl: url })
      return url
    },
    [updateNodeData]
  )

  const handleInputUpload = useCallback(
    async (nodeId, file) => {
      if (!file) return
      const durationSec = await getAudioDuration(file)
      const previewUrl = setInputPreviewUrl(nodeId, file)
      updateNodeData(nodeId, {
        sourceType: 'upload',
        file,
        fileName: file.name,
        durationSec,
        previewUrl,
      })
    },
    [getAudioDuration, setInputPreviewUrl, updateNodeData]
  )

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const recordingCancelRef = useRef(false)

  const stopRecording = useCallback(
    ({ cancel = false } = {}) => {
      if (recordingStatus !== 'recording') return
      recordingCancelRef.current = cancel
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop()
      } else if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setRecordingStream(null)
        setRecordingStatus('idle')
        setRecordingNodeId(null)
        setPipelineStatus(t('status_ready'))
      }
    },
    [recordingStatus, t]
  )

  const startRecording = useCallback(
    async (nodeId) => {
      try {
        if (!nodeId) return
        if (recordingStatus === 'recording') {
          stopRecording({ cancel: true })
        }
        setRecordingElapsed(0)
        setRecordingStatus('recording')
        setRecordingNodeId(nodeId)
        setPipelineStatus(t('status_recording'))
        recordingCancelRef.current = false
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
        setRecordingStream(stream)
        const recorder = new MediaRecorder(stream)
        recorderRef.current = recorder
        const chunks = []
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        recorder.onstop = async () => {
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current)
            recordingTimerRef.current = null
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
          }
          setRecordingStream(null)
          const wasCancelled = recordingCancelRef.current
          recordingCancelRef.current = false
          setRecordingNodeId(null)
          if (wasCancelled || chunks.length === 0) {
            setRecordingStatus('idle')
            setPipelineStatus(t('status_ready'))
            return
          }
          const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' })
          const file = new File([blob], `recording_${Date.now()}.webm`, { type: blob.type })
          await handleInputUpload(nodeId, file)
          setPipelineStatus(t('status_recorded'))
          setRecordingStatus('ready')
        }
        recorder.start()
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        const startedAt = Date.now()
        recordingTimerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startedAt) / 1000)
          setRecordingElapsed(elapsed)
        }, 250)
      } catch (error) {
        setRecordingStatus('idle')
        setPipelineStatus(t('status_failed', { error: error.message }))
        showModal(t('popup_record_fail_title'), t('popup_record_fail_body'))
      }
    },
    [handleInputUpload, recordingStatus, showModal, stopRecording, t]
  )

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  const onDragStart = useCallback((event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return
      if (!reactFlowWrapper.current) return
      const defaultData = {
        input: {
          sourceType: 'upload',
          file: null,
          enabled: true,
          sampleRate: 48000,
          channels: 1,
          device: 'default',
        },
        denoise: { model: 'deepfilternet', attenuation: 12, preset: 'medium', enabled: true },
        separation: { model: 'sepformer', enabled: true },
        custom_model: { model: '', enabled: true },
        mixer: { spk1: 1, spk2: 1, enabled: true },
        export: { format: 'wav', bitrate: 192, normalize: true, enabled: true },
      }
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })
      const newNode = {
        id: createNodeId(type),
        type,
        position,
        data: defaultData[type] || {},
      }
      setNodes((nds) => nds.concat(newNode))
    },
    [createNodeId, project, setNodes]
  )

  const onSelect = useCallback((selection) => {
    const nodesSelected = selection?.nodes || []
    const edgesSelected = selection?.edges || []
    setSelectedNodeId(nodesSelected[0]?.id || null)
    setSelectedNodeIds(new Set(nodesSelected.map((node) => node.id)))
    setSelectedEdgeIds(new Set(edgesSelected.map((edge) => edge.id)))
  }, [])

  const deleteSelection = useCallback(() => {
    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return
    allowNodeRemovalRef.current = true
    allowEdgeRemovalRef.current = true
    setNodes((nds) => nds.filter((node) => !selectedNodeIds.has(node.id)))
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !selectedEdgeIds.has(edge.id) &&
          !selectedNodeIds.has(edge.source) &&
          !selectedNodeIds.has(edge.target)
      )
    )
    setSelectedNodeId(null)
    setSelectedNodeIds(new Set())
    setSelectedEdgeIds(new Set())
  }, [selectedEdgeIds, selectedNodeIds, setEdges, setNodes])

  const clearCanvas = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setSelectedNodeIds(new Set())
    setSelectedEdgeIds(new Set())
    resetOutputs()
    setOpenPanelIds(new Set())
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrlsRef.current.clear()
    clearAudioCache()
  }, [clearAudioCache, resetOutputs, setEdges, setNodes, setOpenPanelIds])

  const toggleNodeEnabled = useCallback(
    (id, enabled) => {
      updateNodeData(id, { enabled })
    },
    [updateNodeData]
  )

  const duplicateNode = useCallback(
    (node) => {
      if (!node) return
      const offset = 40
      const newNode = {
        ...node,
        id: createNodeId(node.type),
        position: { x: node.position.x + offset, y: node.position.y + offset },
        selected: false,
      }
      setNodes((nds) => nds.concat(newNode))
    },
    [createNodeId, setNodes]
  )

  const autoLayout = useCallback(() => {
    const spacingX = 260
    const spacingY = 140
    const nodeIds = nodes.map((node) => node.id)
    const indegree = new Map(nodeIds.map((id) => [id, 0]))
    const adj = new Map(nodeIds.map((id) => [id, []]))

    edges.forEach((edge) => {
      if (adj.has(edge.source) && adj.has(edge.target)) {
        adj.get(edge.source).push(edge.target)
        indegree.set(edge.target, (indegree.get(edge.target) || 0) + 1)
      }
    })

    const queue = nodeIds.filter((id) => (indegree.get(id) || 0) === 0)
    const levels = new Map()
    queue.forEach((id) => levels.set(id, 0))

    while (queue.length) {
      const id = queue.shift()
      const nextLevel = (levels.get(id) || 0) + 1
      adj.get(id).forEach((next) => {
        indegree.set(next, (indegree.get(next) || 0) - 1)
        levels.set(next, Math.max(levels.get(next) || 0, nextLevel))
        if (indegree.get(next) === 0) queue.push(next)
      })
    }

    const maxLevel = Math.max(0, ...Array.from(levels.values()))
    nodes.forEach((node, index) => {
      if (!levels.has(node.id)) {
        levels.set(node.id, maxLevel + 1 + index)
      }
    })

    const columns = new Map()
    nodes.forEach((node) => {
      const level = levels.get(node.id) || 0
      if (!columns.has(level)) columns.set(level, [])
      columns.get(level).push(node.id)
    })

    setNodes((nds) =>
      nds.map((node) => {
        const level = levels.get(node.id) || 0
        const column = columns.get(level) || []
        const row = column.indexOf(node.id)
        return {
          ...node,
          position: { x: level * spacingX, y: row * spacingY },
        }
      })
    )
  }, [edges, nodes, setNodes])

  const deleteNodeById = useCallback(
    (nodeId) => {
      allowNodeRemovalRef.current = true
      allowEdgeRemovalRef.current = true
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null)
        setSelectedNodeIds(new Set())
      }
      setOpenPanelIds((prev) => {
        if (!prev.has(nodeId)) return prev
        const next = new Set(prev)
        next.delete(nodeId)
        return next
      })
      const url = previewUrlsRef.current.get(nodeId)
      if (url) {
        URL.revokeObjectURL(url)
        previewUrlsRef.current.delete(nodeId)
      }
    },
    [selectedNodeId, setEdges, setNodes]
  )

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault()
    setContextMenu({
      nodeId: node.id,
      x: event.clientX,
      y: event.clientY,
    })
  }, [])

  const handleNodeClick = useCallback(() => {}, [])

  const handleEdgeClick = useCallback((event, edge) => {
    event.stopPropagation()
    setSelectedEdgeIds(new Set([edge.id]))
    setSelectedNodeId(null)
    setSelectedNodeIds(new Set())
  }, [])

  const handlePaneClick = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleSave = () => {
    if (!workflowName.trim()) return
    save(workflowName.trim(), serializedWorkflow)
    setPipelineStatus(t('status_saved', { name: workflowName.trim() }))
  }

  const handleLoad = (event) => {
    const name = event.target.value
    if (!name || !workflows[name]) return
    const workflow = workflows[name]
    setNodes(
      workflow.nodes.map((node) => ({
        ...node,
        position: node.position || { x: 0, y: 0 },
        data: (() => {
          const base = { enabled: true, ...node.data }
          if (node.type === 'denoise') {
            base.model = base.model ?? 'deepfilternet'
            base.attenuation = base.attenuation ?? 12
            base.preset = base.preset ?? 'medium'
          }
          if (node.type === 'separation') {
            base.model = base.model ?? 'sepformer'
          }
          if (node.type === 'custom_model') {
            base.model = base.model ?? ''
          }
          if (node.type === 'input') {
            base.sampleRate = base.sampleRate ?? 48000
            base.channels = base.channels ?? 1
            base.device = base.device ?? 'default'
          }
          if (node.type === 'export') {
            base.format = base.format ?? 'wav'
            base.bitrate = base.bitrate ?? 192
            base.normalize = base.normalize ?? true
          }
          return base
        })(),
      }))
    )
    setEdges(workflow.edges.map((edge, index) => ({ id: edge.id || `e-${index}`, ...edge })))
    setWorkflowName(name)
    setPipelineStatus(t('status_loaded', { name }))
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(serializedWorkflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'workflow.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyLockedRef.current = true
    historyIndexRef.current -= 1
    const snapshot = historyRef.current[historyIndexRef.current]
    if (snapshot) {
      setNodes(snapshot.nodes)
      setEdges(snapshot.edges)
    }
  }, [setEdges, setNodes])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyLockedRef.current = true
    historyIndexRef.current += 1
    const snapshot = historyRef.current[historyIndexRef.current]
    if (snapshot) {
      setNodes(snapshot.nodes)
      setEdges(snapshot.edges)
    }
  }, [setEdges, setNodes])

  useEffect(() => {
    if (historyLockedRef.current) {
      historyLockedRef.current = false
      return
    }
    const snapshotKey = JSON.stringify(serializedWorkflow)
    if (snapshotKeyRef.current === snapshotKey) return
    snapshotKeyRef.current = snapshotKey

    const snapshot = {
      nodes: nodes.map((node) => ({ ...node, data: { ...node.data } })),
      edges: edges.map((edge) => ({ ...edge })),
    }

    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(snapshot)
    historyIndexRef.current = historyRef.current.length - 1
  }, [edges, nodes, serializedWorkflow])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target
      const isFormField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      if (isFormField) return

      const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z'
      if (isUndo) {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelection()
      }

      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelection, redo, undo])

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setRecordingStream(null)
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      previewUrlsRef.current.clear()
      clearAudioCache()
    }
  }, [clearAudioCache])

  useEffect(() => {
    setViewport(getViewport())
  }, [getViewport])

  const uiContextValue = useMemo(
    () => ({
      onUpload: handleInputUpload,
      onRun: runFromInputNode,
      openPanel,
      nodeOutputs,
      recordingStatus,
      recordingNodeId,
      recordingElapsed,
      t,
    }),
    [
      handleInputUpload,
      nodeOutputs,
      recordingElapsed,
      recordingNodeId,
      recordingStatus,
      runFromInputNode,
      openPanel,
      t,
    ]
  )

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) || null : null),
    [nodes, selectedNodeId]
  )
  const contextNode = contextMenu ? nodes.find((node) => node.id === contextMenu.nodeId) : null

  return (
    <div className="flex h-screen w-full flex-col">
      <TopBar nodesCount={nodes.length} edgesCount={edges.length} lang={lang} setLang={setLang} t={t} />

      <main className="flex-1 bg-slate-950 p-4">
        <PanelGroup direction="horizontal" className="h-full">
          <Panel defaultSize={18} minSize={14} className="pr-4">
            <LeftSidebar
              onDragStart={onDragStart}
              workflowName={workflowName}
              setWorkflowName={setWorkflowName}
              onSave={handleSave}
              onDelete={() => remove(workflowName.trim())}
              workflows={workflows}
              onLoad={handleLoad}
              onExport={handleExport}
              clearCanvas={clearCanvas}
              autoLayout={autoLayout}
              undo={undo}
              redo={redo}
              t={t}
            />
          </Panel>
          <PanelResizeHandle className="panel-resize-handle" />
          <Panel defaultSize={60} minSize={30} className="px-3">
            <section className="flex h-full flex-col gap-4">
              <WorkflowUIContext.Provider value={uiContextValue}>
                <FlowCanvas
                  nodes={displayNodes}
                  edges={displayEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onSelect={onSelect}
                  onNodeContextMenu={handleNodeContextMenu}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                  onPaneClick={handlePaneClick}
                  onMove={(_event, view) => setViewport(view)}
                  wrapperRef={reactFlowWrapper}
                >
                  {openPanelNodes.map((node) => {
                    const position = getPanelPosition(node)
                    if (node.type === 'input') {
                      return (
                        <PanelErrorBoundary
                          key={`panel-${node.id}`}
                          fallback={
                            <div className="floating-panel" style={{ left: position.x, top: position.y }}>
                              <div className="floating-panel-header">
                                <div className="floating-panel-title">{t('panel_input_title')}</div>
                              </div>
                              <div className="floating-panel-body">
                                <div className="floating-panel-empty">{t('panel_input_empty')}</div>
                              </div>
                            </div>
                          }
                        >
                          <FloatingAudioPanel
                            node={node}
                            position={position}
                            onUpload={handleInputUpload}
                            onStartRecording={startRecording}
                            onStopRecording={() => stopRecording({ cancel: false })}
                            onCancelRecording={() => stopRecording({ cancel: true })}
                            recordingStatus={recordingStatus}
                            recordingElapsed={recordingElapsed}
                            recordingNodeId={recordingNodeId}
                            recordingStream={recordingStream}
                            t={t}
                          />
                        </PanelErrorBoundary>
                      )
                    }
                    if (node.type === 'export') {
                      return (
                        <PanelErrorBoundary
                          key={`panel-${node.id}`}
                          fallback={
                            <div className="floating-panel" style={{ left: position.x, top: position.y }}>
                              <div className="floating-panel-header">
                                <div className="floating-panel-title">{t('panel_output_title')}</div>
                              </div>
                              <div className="floating-panel-body">
                                <div className="floating-panel-empty">{t('panel_output_empty')}</div>
                              </div>
                            </div>
                          }
                        >
                          <FloatingOutputPanel
                            node={node}
                            position={position}
                            nodeOutputs={nodeOutputs}
                            outputUrls={outputUrls}
                            getCachedUrl={getCachedUrl}
                            onDownload={downloadAudio}
                            t={t}
                          />
                        </PanelErrorBoundary>
                      )
                    }
                    return null
                  })}
                </FlowCanvas>
              </WorkflowUIContext.Provider>
              <StatusBar
                pipelineStatus={pipelineStatus}
                isRunning={isRunning}
                selectedNode={selectedNode}
                runPipelineToNode={runPipelineToNode}
                runPipeline={runPipeline}
                t={t}
              />
            </section>
          </Panel>
          <PanelResizeHandle className="panel-resize-handle" />
          <Panel defaultSize={22} minSize={16} className="pl-4">
            <RightSidebar
              selectedNode={selectedNode}
              updateNodeData={updateNodeData}
              nodeOutputs={nodeOutputs}
              outputUrls={outputUrls}
              getCachedUrl={getCachedUrl}
              downloadAudio={downloadAudio}
              realtimeEnabled={realtimeEnabled}
              realtimeStatus={realtimeStatus}
              startRealtime={startRealtime}
              stopRealtime={stopRealtime}
              availableModels={availableModels}
              modelsLoading={modelsLoading}
              modelsError={modelsError}
              t={t}
            />
          </Panel>
        </PanelGroup>
      </main>

      {contextMenu && contextNode && (
        <div
          className="fixed z-50 w-44 rounded-xl border border-slate-700 bg-slate-900/95 p-2 text-sm shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full rounded-lg px-2 py-2 text-left text-slate-200 hover:bg-slate-800"
            onClick={() => {
              deleteNodeById(contextNode.id)
              setContextMenu(null)
            }}
          >
            {t('context_delete')}
          </button>
          <button
            className="w-full rounded-lg px-2 py-2 text-left text-slate-200 hover:bg-slate-800"
            onClick={() => {
              duplicateNode(contextNode)
              setContextMenu(null)
            }}
          >
            {t('context_duplicate')}
          </button>
          <button
            className="w-full rounded-lg px-2 py-2 text-left text-slate-200 hover:bg-slate-800"
            onClick={() => {
              toggleNodeEnabled(contextNode.id, contextNode.data?.enabled === false)
              setContextMenu(null)
            }}
          >
            {contextNode.data?.enabled === false ? t('context_enable') : t('context_disable')}
          </button>
          <button
            className="w-full rounded-lg px-2 py-2 text-left text-slate-200 hover:bg-slate-800"
            onClick={() => {
              runPipelineToNode(contextNode.id)
              setContextMenu(null)
            }}
          >
            {t('context_run_to_here')}
          </button>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="text-lg font-semibold text-slate-100">{modal.title}</div>
            <p className="mt-2 text-sm text-slate-300">{modal.body}</p>
            <button
              className="mt-4 w-full rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950"
              onClick={() => setModal(null)}
            >
              {t('popup_ok')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  )
}
