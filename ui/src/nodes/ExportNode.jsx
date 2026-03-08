import { Handle, Position } from 'reactflow'
import { useWorkflowUI } from '../contexts/WorkflowUIContext'
import { useRenderTimer } from '../hooks/useRenderTimer'

export default function ExportNode({ data, id }) {
  const disabled = data?.enabled === false
  const ui = useWorkflowUI()
  useRenderTimer(`Node:Export:${id}`)
  return (
    <div
      className={`relative rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 shadow-lg shadow-black/30 ${disabled ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        className="node-corner-btn"
        onClick={(event) => {
          event.stopPropagation()
          ui?.openPanel?.(id)
        }}
        aria-label={ui?.t?.('node_export') || 'Export'}
      >
        ●
      </button>
      <div className="text-sm font-semibold text-slate-100">
        {ui?.t?.('node_export') || 'Export'}
      </div>
      <div className="text-xs text-slate-400">{ui?.t?.('export_subtitle') || 'Save / download'}</div>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-slate-400" />
    </div>
  )
}
