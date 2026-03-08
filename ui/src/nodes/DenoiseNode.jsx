import { Handle, Position } from 'reactflow'
import { useWorkflowUI } from '../contexts/WorkflowUIContext'
import { useRenderTimer } from '../hooks/useRenderTimer'

export default function DenoiseNode({ data }) {
  const disabled = data?.enabled === false
  const ui = useWorkflowUI()
  const modelLabel = data?.model || data?.model_name || ui?.t?.('denoise_subtitle') || 'deepfilternet'
  useRenderTimer(`Node:Denoise`)
  return (
    <div
      className={`rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 shadow-lg shadow-black/30 ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="text-sm font-semibold text-slate-100">{ui?.t?.('node_denoise') || 'Noise Reduction'}</div>
      <div className="text-xs text-slate-400">{modelLabel}</div>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-slate-400" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-emerald-400" />
    </div>
  )
}
