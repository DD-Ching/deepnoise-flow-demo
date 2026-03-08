import { useCallback, useMemo } from 'react'

export default function Inspector({
  selectedNode,
  onUpdate,
  nodeOutputs,
  outputUrls,
  getCachedUrl,
  onDownload,
  availableModels = [],
  modelsLoading = false,
  modelsError = '',
  t,
}) {
  const hasSelection = Boolean(selectedNode)
  const nodeId = selectedNode?.id || ''
  const nodeType = selectedNode?.type || ''
  const nodeData = selectedNode?.data || {}

  const buildEntries = useCallback(
    (payload) => {
      if (!payload) return []
      const entries = []
      const add = (key, labelKey) => {
        const url = payload[key]
        if (!url) return
        entries.push({ key, label: t(labelKey), url })
      }
      add('audio', 'preview_audio')
      add('clean', 'preview_clean')
      add('noise', 'preview_noise')
      add('speaker_1', 'preview_speaker_1')
      add('speaker_2', 'preview_speaker_2')
      return entries
    },
    [t]
  )

  const globalEntries = useMemo(() => buildEntries(outputUrls), [buildEntries, outputUrls])
  const previewEntries = useMemo(
    () => buildEntries(nodeId ? nodeOutputs?.[nodeId] : null),
    [buildEntries, nodeId, nodeOutputs]
  )
  const modelOptions = useMemo(() => {
    const names = new Set()
    ;(availableModels || []).forEach((name) => {
      if (typeof name !== 'string') return
      const trimmed = name.trim()
      if (!trimmed) return
      names.add(trimmed)
    })
    return Array.from(names).sort()
  }, [availableModels])

  const renderEntries = (entries) => (
    <div className="space-y-3">
      {entries.map((entry) => {
        const src = getCachedUrl ? getCachedUrl(entry.url) : entry.url
        return (
          <div
            key={`${entry.key}-${entry.url}`}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
          >
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{entry.label}</span>
              <button
                type="button"
                className="font-semibold text-sky-300 underline"
                onClick={() => onDownload?.(entry.url)}
              >
                {t('output_download_btn')}
              </button>
            </div>
            <audio
              className="floating-audio mt-2"
              controls
              preload="metadata"
              crossOrigin="anonymous"
              src={src || undefined}
            />
          </div>
        )
      })}
    </div>
  )

  if (!hasSelection) {
    return (
      <div className="panel-card h-full p-4">
        <div className="panel-title">{t('inspector_title')}</div>
        <p className="mt-3 text-sm text-slate-300">{t('inspector_hint')}</p>
        {globalEntries.length > 0 && (
          <div className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-200">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {t('output_title')}
            </div>
            {renderEntries(globalEntries)}
          </div>
        )}
      </div>
    )
  }

  const nodeLabel = t(`node_${nodeType}`)

  const update = (patch) => onUpdate(nodeId, { ...nodeData, ...patch })
  const modelDatalistId = `model-options-${nodeId || 'node'}`
  const readModelValue = (fallback) => {
    if (typeof nodeData.model === 'string') return nodeData.model
    if (typeof nodeData.model_name === 'string') return nodeData.model_name
    return fallback
  }

  const renderModelPicker = (fallbackModel) => (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('model_picker_label')}</label>
      <input
        type="text"
        className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        list={modelOptions.length ? modelDatalistId : undefined}
        value={readModelValue(fallbackModel)}
        onChange={(event) => update({ model: event.target.value, model_name: event.target.value })}
        disabled={!enabled}
        placeholder={t('model_picker_placeholder')}
      />
      {modelOptions.length > 0 && (
        <datalist id={modelDatalistId}>
          {modelOptions.map((modelName) => (
            <option key={modelName} value={modelName} />
          ))}
        </datalist>
      )}
      {modelsLoading && <p className="mt-2 text-xs text-slate-400">{t('model_picker_loading')}</p>}
      {!modelsLoading && modelsError && (
        <p className="mt-2 text-xs text-amber-300">{t('model_picker_error')}</p>
      )}
      {!modelsLoading && !modelsError && (
        <p className="mt-2 text-xs text-slate-400">{t('model_picker_hint')}</p>
      )}
    </div>
  )

  const enabled = nodeData.enabled !== false
  const attenuationValue = Number.isFinite(Number(nodeData.attenuation))
    ? Number(nodeData.attenuation)
    : 12
  let denoisePreset = null
  if (nodeType === 'denoise') {
    if (nodeData.preset) {
      denoisePreset = nodeData.preset
    } else if (attenuationValue === 6) {
      denoisePreset = 'light'
    } else if (attenuationValue === 12) {
      denoisePreset = 'medium'
    } else if (attenuationValue === 18) {
      denoisePreset = 'heavy'
    } else {
      denoisePreset = 'custom'
    }
  }

  return (
    <div className="panel-card h-full p-4">
      <div className="panel-title">{t('inspector_title')}</div>
      <div className="mt-2 text-lg font-semibold text-slate-100">{nodeLabel || nodeType}</div>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200">
        <span>{t('node_enabled')}</span>
        <button
          type="button"
          onClick={() => update({ enabled: !enabled })}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
        >
          {enabled ? t('toggle_on') : t('toggle_off')}
        </button>
      </div>
      {!enabled && (
        <p className="mt-2 text-xs text-amber-300">{t('node_disabled_hint')}</p>
      )}

      {nodeType === 'input' && (
        <div className="mt-4 space-y-4 text-sm text-slate-200">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {t('input_sample_rate')}
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              value={nodeData.sampleRate ?? 48000}
              onChange={(event) => update({ sampleRate: Number(event.target.value) })}
              disabled={!enabled}
            >
              {[16000, 32000, 44100, 48000].map((rate) => (
                <option key={rate} value={rate}>
                  {rate} Hz
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {t('input_channels')}
            </label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              value={nodeData.channels ?? 1}
              onChange={(event) => update({ channels: Number(event.target.value) })}
              disabled={!enabled}
            >
              <option value={1}>Mono</option>
              <option value={2}>Stereo</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {t('input_device')}
            </label>
            <input
              type="text"
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              value={nodeData.device || 'default'}
              onChange={(event) => update({ device: event.target.value })}
              disabled={!enabled}
            />
          </div>
          <p className="text-xs text-slate-400">{t('input_panel_hint')}</p>
        </div>
      )}

      {nodeType === 'denoise' && (
        <div className="mt-4 space-y-4 text-sm text-slate-200">
          {renderModelPicker('deepfilternet')}
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('denoise_preset_label')}</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { id: 'light', label: t('denoise_preset_light'), value: 6 },
                { id: 'medium', label: t('denoise_preset_medium'), value: 12 },
                { id: 'heavy', label: t('denoise_preset_heavy'), value: 18 },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => update({ preset: preset.id, attenuation: preset.value })}
                  disabled={!enabled}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${denoisePreset === preset.id ? 'border-emerald-300 bg-emerald-400/20 text-emerald-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {denoisePreset === 'custom' && (
              <div className="mt-2 text-xs text-amber-300">{t('denoise_preset_custom')}</div>
            )}
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {t('denoise_atten_label')}
            </label>
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={attenuationValue}
              onChange={(event) => {
                const value = Number(event.target.value)
                const preset =
                  value === 6 ? 'light' : value === 12 ? 'medium' : value === 18 ? 'heavy' : 'custom'
                update({ attenuation: value, preset })
              }}
              className="mt-2 w-full"
              disabled={!enabled}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>0 dB</span>
              <span>{attenuationValue} dB</span>
              <span>24 dB</span>
            </div>
          </div>
        </div>
      )}

      {nodeType === 'separation' && (
        <div className="mt-4 space-y-4 text-sm text-slate-200">{renderModelPicker('sepformer')}</div>
      )}

      {nodeType === 'custom_model' && (
        <div className="mt-4 space-y-4 text-sm text-slate-200">
          {renderModelPicker('')}
          <p className="text-xs text-slate-400">{t('custom_model_hint')}</p>
        </div>
      )}

      {nodeType === 'mixer' && (
        <div className="mt-4 space-y-4 text-sm text-slate-200">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('mixer_spk1_label')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={nodeData.spk1 ?? 1}
              onChange={(event) => update({ spk1: Number(event.target.value) })}
              className="mt-2 w-full"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('mixer_spk2_label')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={nodeData.spk2 ?? 1}
              onChange={(event) => update({ spk2: Number(event.target.value) })}
              className="mt-2 w-full"
            />
          </div>
        </div>
      )}

      {nodeType === 'export' && (
        <div className="mt-4 space-y-4 text-sm text-slate-200">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('export_format_label')}</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              value={nodeData.format || 'wav'}
              onChange={(event) => update({ format: event.target.value })}
              disabled={!enabled}
            >
              <option value="wav">{t('export_format_wav')}</option>
              <option value="mp3">{t('export_format_mp3')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('export_bitrate')}</label>
            <select
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
              value={nodeData.bitrate ?? 192}
              onChange={(event) => update({ bitrate: Number(event.target.value) })}
              disabled={!enabled}
            >
              {[96, 128, 192, 256, 320].map((rate) => (
                <option key={rate} value={rate}>
                  {rate} kbps
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200">
            <span>{t('export_normalize')}</span>
            <button
              type="button"
              onClick={() => update({ normalize: !(nodeData.normalize ?? true) })}
              disabled={!enabled}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                nodeData.normalize ?? true
                  ? 'bg-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {nodeData.normalize ?? true ? t('toggle_on') : t('toggle_off')}
            </button>
          </div>
        </div>
      )}

      {previewEntries.length > 0 && (
        <div className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-200">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t('preview_title')}
          </div>
          {renderEntries(previewEntries)}
        </div>
      )}

      {globalEntries.length > 0 && (
        <div className="mt-5 border-t border-slate-800 pt-4 text-sm text-slate-200">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t('output_title')}
          </div>
          {renderEntries(globalEntries)}
        </div>
      )}
    </div>
  )
}
