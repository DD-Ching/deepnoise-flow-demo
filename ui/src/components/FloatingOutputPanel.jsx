import { memo } from 'react'
import WaveformCanvas from './WaveformCanvas'

function FloatingOutputPanel({ node, position, nodeOutputs, outputUrls, getCachedUrl, onDownload, t }) {
  if (!node) return null
  const output = nodeOutputs?.[node.id] || {}
  const outputUrl =
    output.audio ||
    output.clean ||
    output.noise ||
    outputUrls?.clean ||
    outputUrls?.noise ||
    null
  const resolvedUrl = outputUrl ? getCachedUrl?.(outputUrl) || outputUrl : null

  return (
    <div className="floating-panel" style={{ left: position.x, top: position.y }}>
      <div className="floating-panel-header">
        <div>
          <div className="floating-panel-title">{t('panel_output_title')}</div>
          <div className="floating-panel-subtitle">{t('output_play_label')}</div>
        </div>
      </div>
      <div className="floating-panel-body">
        <div className="wave-panel">
          <WaveformCanvas source={resolvedUrl} height={110} color="rgba(52, 211, 153, 0.9)" />
        </div>
        {resolvedUrl ? (
          <div className="floating-panel-preview">
            <audio
              key={resolvedUrl}
              className="floating-audio"
              controls
              preload="metadata"
              crossOrigin="anonymous"
              src={resolvedUrl}
            />
            <button
              type="button"
              className="text-xs font-semibold text-sky-300 underline"
              onClick={() => onDownload?.(outputUrl)}
            >
              {t('output_download_btn')}
            </button>
          </div>
        ) : (
          <div className="floating-panel-empty">{t('panel_output_empty')}</div>
        )}
      </div>
    </div>
  )
}

export default memo(FloatingOutputPanel)
