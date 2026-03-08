import { useCallback, useMemo, useState } from 'react'

export function usePanels({ nodes, getNode, wrapperRef, viewport }) {
  const [openPanelIds, setOpenPanelIds] = useState(() => new Set())

  const openPanel = useCallback((nodeId) => {
    if (!nodeId) return
    setOpenPanelIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const openPanelNodes = useMemo(
    () =>
      Array.from(openPanelIds)
        .map((nodeId) => getNode(nodeId) || nodes.find((node) => node.id === nodeId) || null)
        .filter(Boolean),
    [getNode, nodes, openPanelIds]
  )

  const getPanelPosition = useCallback(
    (node) => {
      if (!node || !wrapperRef.current) return { x: 0, y: 0 }
      const bounds = wrapperRef.current.getBoundingClientRect()
      const nodePos = node.positionAbsolute || node.position
      const zoom = viewport.zoom || 1
      const nodeWidth = node.width || 220
      const panelWidth = 340
      const panelHeight = 320
      let x = nodePos.x * zoom + viewport.x + nodeWidth * zoom + 12
      let y = nodePos.y * zoom + viewport.y - 12
      x = Math.max(12, Math.min(x, bounds.width - panelWidth - 12))
      y = Math.max(12, Math.min(y, bounds.height - panelHeight - 12))
      return { x, y }
    },
    [viewport, wrapperRef]
  )

  return {
    openPanelIds,
    setOpenPanelIds,
    openPanel,
    openPanelNodes,
    getPanelPosition,
  }
}
