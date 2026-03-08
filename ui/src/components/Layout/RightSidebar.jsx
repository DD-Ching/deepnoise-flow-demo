import { memo } from 'react'

import Inspector from '../Inspector'

function RightSidebar({
  selectedNode,
  updateNodeData,
  nodeOutputs,
  outputUrls,
  getCachedUrl,
  downloadAudio,
  realtimeEnabled,
  realtimeStatus,
  startRealtime,
  stopRealtime,
  availableModels,
  modelsLoading,
  modelsError,
  t,
}) {
  return (
    <aside className="flex h-full flex-col gap-4">
      <Inspector
        selectedNode={selectedNode}
        onUpdate={updateNodeData}
        nodeOutputs={nodeOutputs}
        outputUrls={outputUrls}
        getCachedUrl={getCachedUrl}
        onDownload={downloadAudio}
        availableModels={availableModels}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
        t={t}
      />
      <div className="panel-card p-4">
        <div className="panel-title">{t('realtime_title')}</div>
        <p className="mt-2 text-sm text-slate-300">{t('realtime_desc')}</p>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm">
          <span>{realtimeStatus}</span>
          <button
            onClick={realtimeEnabled ? stopRealtime : startRealtime}
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold"
          >
            {realtimeEnabled ? t('realtime_stop') : t('realtime_start')}
          </button>
        </div>
      </div>
    </aside>
  )
}

export default memo(RightSidebar)
