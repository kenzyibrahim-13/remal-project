import CountUp from './CountUp.jsx'

function Card({ label, children, unit, accent }) {
  return (
    <div className="flex-1 min-w-[150px] rounded-xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums" style={{ color: accent }}>
          {children}
        </span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  )
}

export default function KpiCards({ kpi }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Card label="Saved" unit="EGP" accent="#fbbf24">
        <CountUp value={kpi.egp} />
      </Card>
      <Card label="Tons diverted" unit="t" accent="#22c55e">
        <CountUp value={kpi.tons} />
      </Card>
      <Card label="CO₂ avoided" unit="kg" accent="#38bdf8">
        <CountUp value={kpi.co2} />
      </Card>
      <Card label="Matches" unit="" accent="#e2e8f0">
        <CountUp value={kpi.matches} />
      </Card>
    </div>
  )
}
