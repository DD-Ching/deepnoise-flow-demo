import { memo } from 'react'

function StatusBar({ pipelineStatus, isRunning, selectedNode, runPipelineToNode, runPipeline, t }) {
  return (
    <div className="panel-card flex items-center justify-between px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-slate-100">{t('pipeline_status_title')}</div>
        <div className="text-xs text-slate-400">{pipelineStatus}</div>
        {isRunning && (
          <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-full animate-pulse bg-emerald-400" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => runPipelineToNode(selectedNode?.id)}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100"
          disabled={!selectedNode}
        >
          {t('pipeline_run_to_selected')}
        </button>
        <button
          onClick={() => runPipeline()}
          className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
        >
          {t('pipeline_run_button')}
        </button>
      </div>
    </div>
  )
}

export default memo(StatusBar)
