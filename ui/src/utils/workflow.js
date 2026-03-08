export function buildWorkflowJSON(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data || {},
    })),
    edges: edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
    })),
  }
}

function buildAdjacency(edges, nodeIds) {
  const adjacency = new Map()
  nodeIds.forEach((id) => adjacency.set(id, []))
  edges.forEach((edge) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency.get(edge.source).push(edge.target)
    }
  })
  return adjacency
}

function computeReachable(starts, adjacency) {
  const visited = new Set()
  const queue = [...starts]
  while (queue.length) {
    const node = queue.shift()
    if (!node || visited.has(node)) continue
    visited.add(node)
    const next = adjacency.get(node) || []
    next.forEach((target) => {
      if (!visited.has(target)) queue.push(target)
    })
  }
  return visited
}

export function getWorkflowDiagnostics(nodes, edges) {
  const errors = []
  const warnings = []

  const inputNodes = nodes.filter((node) => node.type === 'input')
  const exportNodes = nodes.filter((node) => node.type === 'export')

  if (inputNodes.length === 0) {
    errors.push('error_missing_input')
  }
  if (inputNodes.length > 1) {
    warnings.push('warn_multiple_input')
  }
  if (exportNodes.length === 0) {
    errors.push('error_missing_export')
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  const danglingEdges = edges.filter((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))
  if (danglingEdges.length > 0) {
    warnings.push('warn_dangling_edges')
  }

  if (inputNodes.length > 0 && exportNodes.length > 0) {
    const adjacency = buildAdjacency(edges, nodeIds)
    const reachable = computeReachable([inputNodes[0].id], adjacency)
    const hasExport = exportNodes.some((node) => reachable.has(node.id))
    if (!hasExport) {
      errors.push('error_no_export_reachable')
    }
  }

  return { errors, warnings }
}
