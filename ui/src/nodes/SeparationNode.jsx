import { Handle, Position } from 'reactflow'
import { useWorkflowUI } from '../contexts/WorkflowUIContext'
import { useRenderTimer } from '../hooks/useRenderTimer'

export default function SeparationNode({ data }) {
  const disabled = data?.enabled === false
  const ui = useWorkflowUI()
  const modelLabel = data?.model || data?.model_name || ui?.t?.('separation_subtitle') || 'sepformer'
  useRenderTimer(`Node:Separation`)
  return (
    <div
      className={`rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 shadow-lg shadow-black/30 ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="text-sm font-semibold text-slate-100">
        {ui?.t?.('node_separation') || 'Speaker Separation'}
      </div>
      <div className="text-xs text-slate-400">{modelLabel}</div>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-slate-400" />
      <Handle type="source" id="speaker_1" position={Position.Right} className="!h-3 !w-3 !bg-fuchsia-400" style={{ top: '40%' }} />
      <Handle type="source" id="speaker_2" position={Position.Right} className="!h-3 !w-3 !bg-amber-400" style={{ top: '70%' }} />
    </div>
  )
}
