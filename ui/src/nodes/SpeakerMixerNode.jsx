import { Handle, Position } from 'reactflow'
import { useWorkflowUI } from '../contexts/WorkflowUIContext'
import { useRenderTimer } from '../hooks/useRenderTimer'

export default function SpeakerMixerNode({ data }) {
  const disabled = data?.enabled === false
  const ui = useWorkflowUI()
  useRenderTimer(`Node:Mixer`)
  return (
    <div
      className={`rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 shadow-lg shadow-black/30 ${disabled ? 'opacity-50' : ''}`}
    >
      <div className="text-sm font-semibold text-slate-100">
        {ui?.t?.('node_mixer') || 'Speaker Mixer'}
      </div>
      <div className="text-xs text-slate-400">{ui?.t?.('mixer_subtitle') || 'Blend speakers'}</div>
      <Handle type="target" id="in_1" position={Position.Left} className="!h-3 !w-3 !bg-fuchsia-400" style={{ top: '40%' }} />
      <Handle type="target" id="in_2" position={Position.Left} className="!h-3 !w-3 !bg-amber-400" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-emerald-400" />
    </div>
  )
}
