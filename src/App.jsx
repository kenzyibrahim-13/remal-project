import { useCallback, useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import IngestForm from './components/IngestForm.jsx'
import ResultPanel from './components/ResultPanel.jsx'
import KpiCards from './components/KpiCards.jsx'
import { getNodes, postMatch, hydrate } from './lib/api.js'
import { FALLBACK_NODES, TYPE_META } from './lib/nodes.js'

const EMPTY_KPI = { egp: 0, tons: 0, co2: 0, matches: 0 }

export default function App() {
  const [nodes, setNodes] = useState(FALLBACK_NODES)
  const [source, setSource] = useState('local') // 'api' | 'local'
  const [siteId, setSiteId] = useState('d1')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [kpi, setKpi] = useState(EMPTY_KPI)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    getNodes().then(({ nodes, source }) => {
      setNodes(nodes)
      setSource(source)
      const firstSite = nodes.find((n) => n.type === 'demolition')
      if (firstSite) setSiteId(firstSite.id)
    })
  }, [])

  const sites = useMemo(() => nodes.filter((n) => n.type === 'demolition'), [nodes])

  const handleSelectSite = useCallback((id) => {
    setSiteId(id)
    setResult(null)
  }, [])

  const handleSubmit = async (body) => {
    setLoading(true)
    try {
      const { result: raw, source } = await postMatch(body, nodes)
      setSource(source)
      const r = { ...hydrate(raw, nodes), purity: body.purity ?? null }
      setResult(r)
      setKpi((k) => ({
        egp: k.egp + (r.savings_egp || 0),
        tons: k.tons + (r.tons_diverted || 0),
        co2: k.co2 + (r.co2_kg_avoided || 0),
        matches: k.matches + 1,
      }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-amber-400">Remal</span>
          </h1>
          <span className="hidden text-xs text-slate-500 sm:inline">
            Circular C&amp;D waste matching · Greater Cairo
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              source === 'api' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-300'
            }`}
            title={source === 'api' ? 'Using the FastAPI backend' : 'Using the built-in offline engine'}
          >
            {source === 'api' ? '● Live API' : '● Offline mode'}
          </span>
          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            {theme === 'dark' ? 'Light map' : 'Dark map'}
          </button>
          <button
            onClick={() => {
              setKpi(EMPTY_KPI)
              setResult(null)
            }}
            className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="border-b border-slate-800 px-5 py-3">
        <KpiCards kpi={kpi} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="w-full shrink-0 space-y-5 overflow-y-auto border-b border-slate-800 p-5 md:w-[360px] md:border-b-0 md:border-r">
          <IngestForm
            sites={sites}
            siteId={siteId}
            onSiteChange={handleSelectSite}
            onSubmit={handleSubmit}
            loading={loading}
          />
          <ResultPanel result={result} />
        </aside>

        <main className="relative min-h-[420px] flex-1">
          <MapView
            nodes={nodes}
            selectedSiteId={siteId}
            onSelectSite={handleSelectSite}
            result={result}
            theme={theme}
          />
          <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs">
            {Object.entries(TYPE_META).map(([k, m]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                <span className="text-slate-300">{m.label}</span>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
