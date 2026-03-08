import { memo } from 'react'

function TopBar({ nodesCount, edgesCount, lang, setLang, t }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
      <div>
        <div className="text-2xl font-semibold text-slate-100">{t('app_title')}</div>
        <div className="text-sm text-slate-400">{t('app_subtitle')}</div>
      </div>
      <div className="flex items-center gap-4">
        <span className="badge">
          {nodesCount} {t('badge_nodes')}
        </span>
        <span className="badge">
          {edgesCount} {t('badge_connections')}
        </span>
        <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-1 py-1 text-xs font-semibold text-slate-200">
          <button
            type="button"
            onClick={() => setLang('zh')}
            className={`rounded-full px-2 py-1 ${
              lang === 'zh' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'
            }`}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`rounded-full px-2 py-1 ${
              lang === 'en' ? 'bg-slate-800 text-slate-100' : 'text-slate-400'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  )
}

export default memo(TopBar)
