import { memo } from 'react'

import NodePalette from '../NodePalette'

function LeftSidebar({
  onDragStart,
  workflowName,
  setWorkflowName,
  onSave,
  onDelete,
  workflows,
  onLoad,
  onExport,
  clearCanvas,
  autoLayout,
  undo,
  redo,
  t,
}) {
  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <div className="panel-card p-4">
        <div className="panel-title">{t('showcase_title')}</div>
        <p className="mt-2 text-sm text-slate-300">{t('showcase_body')}</p>
        <p className="mt-3 text-xs text-slate-400">{t('showcase_stack')}</p>
        <p className="mt-1 text-xs text-slate-400">{t('showcase_workflow')}</p>
      </div>
      <NodePalette onDragStart={onDragStart} t={t} />
      <div className="panel-card p-4">
        <div className="panel-title">{t('guardrails_title')}</div>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li>{t('guardrail_size')}</li>
          <li>{t('guardrail_duration')}</li>
          <li>{t('guardrail_rate')}</li>
          <li>{t('guardrail_timeout')}</li>
          <li>{t('guardrail_busy')}</li>
        </ul>
      </div>
      <div className="panel-card p-4">
        <div className="panel-title">{t('workflow_title')}</div>
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="text"
            value={workflowName}
            onChange={(event) => setWorkflowName(event.target.value)}
            placeholder={t('workflow_name_placeholder')}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
            >
              {t('workflow_save')}
            </button>
            <button
              onClick={onDelete}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm"
            >
              {t('workflow_delete')}
            </button>
          </div>
          <select
            onChange={onLoad}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              {t('workflow_load')}
            </option>
            {Object.keys(workflows).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button onClick={onExport} className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm">
            {t('workflow_export')}
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={clearCanvas} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">
              {t('workflow_clear')}
            </button>
            <button onClick={autoLayout} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">
              {t('workflow_layout')}
            </button>
            <button onClick={undo} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">
              {t('workflow_undo')}
            </button>
            <button onClick={redo} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">
              {t('workflow_redo')}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default memo(LeftSidebar)
