import { Handle, Position } from 'reactflow'
import { useWorkflowUI } from '../contexts/WorkflowUIContext'
import { useRenderTimer } from '../hooks/useRenderTimer'

function formatDuration(durationSec) {
  if (!durationSec || Number.isNaN(durationSec)) return '--:--'
  const total = Math.max(0, Math.round(durationSec))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function InputNode({ data, id }) {
  const disabled = data?.enabled === false
  const ui = useWorkflowUI()
  useRenderTimer(`Node:Input:${id}`)
  const fileName = data?.fileName || data?.file?.name
  const duration = formatDuration(data?.durationSec)

  return (
    <div
      className={`relative cursor-pointer rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-lg shadow-black/30 ${disabled ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        className="node-corner-btn"
        onClick={(event) => {
          event.stopPropagation()
          ui?.openPanel?.(id)
        }}
        aria-label={ui?.t?.('panel_input_title') || 'Open input panel'}
      >
        ●
      </button>
      <div className="text-sm font-semibold text-slate-100">{ui?.t?.('node_input') || 'Input'}</div>
      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {ui?.t?.('input_ui_source') || 'Audio Source'}
      </div>

      <div className="mt-3 text-xs text-slate-300">
        <div>{(ui?.t?.('input_ui_file') || 'File') + ': ' + (fileName || ui?.t?.('input_ui_no_file') || '—')}</div>
        <div>{(ui?.t?.('input_ui_duration') || 'Duration') + ': ' + duration}</div>
      </div>

      <div className="mt-3 border-t border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => ui?.onRun?.(id)}
          className="w-full rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950"
          disabled={!ui?.onRun || disabled}
        >
          {ui?.t?.('input_ui_run') || 'Start processing'}
        </button>
      </div>

      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-sky-400" />
    </div>
  )
}
