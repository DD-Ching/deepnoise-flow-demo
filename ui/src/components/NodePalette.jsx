const NODE_CATALOG = [
  { type: 'input', labelKey: 'node_input' },
  { type: 'denoise', labelKey: 'node_denoise' },
  { type: 'separation', labelKey: 'node_separation' },
  { type: 'custom_model', labelKey: 'node_custom_model' },
  { type: 'mixer', labelKey: 'node_mixer' },
  { type: 'export', labelKey: 'node_export' },
]

export default function NodePalette({ onDragStart, t }) {
  return (
    <div className="panel-card h-full p-4">
      <div className="panel-title">{t('palette_title')}</div>
      <p className="mt-2 text-sm text-slate-300">{t('palette_hint')}</p>
      <div className="mt-4 flex flex-col gap-3">
        {NODE_CATALOG.map((node) => (
          <div
            key={node.type}
            className="cursor-grab rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-600"
            draggable
            onDragStart={(event) => onDragStart(event, node.type)}
          >
            {t(node.labelKey)}
          </div>
        ))}
      </div>
    </div>
  )
}
