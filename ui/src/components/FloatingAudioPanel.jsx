import { useRef } from 'react'
import { memo } from 'react'
import WaveformCanvas from './WaveformCanvas'

function formatDuration(durationSec) {
  if (!durationSec || Number.isNaN(durationSec)) return '--:--'
  const total = Math.max(0, Math.round(durationSec))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function FloatingAudioPanel({
  node,
  position,
  onUpload,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  recordingStatus,
  recordingElapsed,
  recordingNodeId,
  recordingStream,
  t,
}) {
  const fileInputRef = useRef(null)
  const audioRef = useRef(null)

  const isRecording = recordingStatus === 'recording' && recordingNodeId === node?.id
  const previewUrl = node?.data?.previewUrl
  const fileName = node?.data?.fileName || node?.data?.file?.name
  const duration = formatDuration(node?.data?.durationSec)
  const hasAudio = Boolean(previewUrl)


  if (!node) return null

  return (
    <div className="floating-panel" style={{ left: position.x, top: position.y }}>
      <div className="floating-panel-header">
        <div>
          <div className="floating-panel-title">{t('panel_input_title')}</div>
          <div className="floating-panel-subtitle">{fileName || t('input_ui_no_file')}</div>
        </div>
      </div>
      <div className="floating-panel-body">
        <div className="wave-panel">
          <WaveformCanvas
            source={!isRecording ? previewUrl || node?.data?.file : null}
            stream={isRecording ? recordingStream : null}
            height={110}
            color="rgba(249, 115, 22, 0.9)"
          />
          <div className="floating-panel-meta">
            <span>{`${t('input_ui_file')}: ${fileName || t('input_ui_no_file')}`}</span>
            <span>{`${t('input_ui_duration')}: ${duration}`}</span>
          </div>
        </div>

        <div className="floating-panel-actions">
          <button
            type="button"
            className="floating-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording}
          >
            {t('panel_upload')}
          </button>
          <button
            type="button"
            className="floating-btn ghost"
            onClick={() => onStartRecording(node.id)}
            disabled={isRecording}
          >
            {t('panel_record')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onUpload(node.id, file)
              event.target.value = ''
            }}
          />
        </div>

        {isRecording ? (
          <div className="floating-panel-recording">
            <div className="floating-panel-timer">{t('recording_timer', { current: recordingElapsed })}</div>
            <div className="floating-panel-actions">
              <button type="button" className="floating-btn" onClick={onStopRecording}>
                {t('panel_record_stop')}
              </button>
              <button type="button" className="floating-btn ghost" onClick={onCancelRecording}>
                {t('panel_record_cancel')}
              </button>
            </div>
          </div>
        ) : hasAudio ? (
          <div className="floating-panel-preview">
            <audio ref={audioRef} src={previewUrl} className="floating-audio" controls preload="metadata" />
            <div className="floating-panel-actions">
              <button
                type="button"
                className="floating-btn"
                onClick={() => {
                  if (!audioRef.current) return
                  if (audioRef.current.paused) {
                    audioRef.current.play()
                  } else {
                    audioRef.current.pause()
                  }
                }}
              >
                {t('panel_record_play')}
              </button>
              <button
                type="button"
                className="floating-btn ghost"
                onClick={() => onStartRecording(node.id)}
              >
                {t('panel_record_rerecord')}
              </button>
            </div>
          </div>
        ) : (
          <div className="floating-panel-empty">{t('panel_input_empty')}</div>
        )}
      </div>
    </div>
  )
}

export default memo(FloatingAudioPanel)
