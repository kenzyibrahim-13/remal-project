const egp = (v) => `${Math.round(v).toLocaleString()} EGP`

function Row({ label, base, remal, strong }) {
  return (
    <tr className={strong ? 'border-t border-slate-600 font-semibold' : ''}>
      <td className="py-1 pr-2 text-slate-400">{label}</td>
      <td className="py-1 pr-2 text-right tabular-nums">{base}</td>
      <td className="py-1 text-right tabular-nums text-amber-300">{remal}</td>
    </tr>
  )
}

export default function ResultPanel({ result }) {
  if (!result) {
    return (
      <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-500">
        Pick a demolition site and press <span className="text-slate-300">Calculate Best Route</span> to see the
        matched plant, road project and savings.
      </p>
    )
  }

  const tri = result.mode === 'triangular'
  const stops = tri
    ? [
        ['Pickup', result.site.name, result.legs[0]?.km],
        ['Drop rubble', result.plant.name, result.legs[1]?.km],
        ['Deliver gravel', result.road.name, result.legs[2]?.km],
      ]
    : [
        ['Pickup', result.site.name, result.legs[0]?.km],
        ['Drop rubble', result.plant.name, null],
      ]

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            tri ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-700 text-slate-300'
          }`}
        >
          {tri ? 'Triangular backhaul' : 'Plant-only route'}
        </span>
        <span className="text-xs text-slate-500">
          {result.trips} truck trip{result.trips > 1 ? 's' : ''}
        </span>
      </div>

      {result.purity != null && (
        <p className="text-xs text-slate-400">
          Rubble grade: <b className="text-slate-200">{result.purity}% concrete</b> (from photo)
        </p>
      )}

      {!tri && (
        <p className="rounded-md bg-slate-800 p-2 text-xs text-slate-400">
          No road project in range needs gravel, so Remal falls back to the cheapest legal plant.
        </p>
      )}

      <ol className="space-y-1.5">
        {stops.map(([role, name, km], i) => (
          <li key={role} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px]">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="text-slate-200">{name}</div>
              <div className="text-[11px] text-slate-500">
                {role}
                {km != null ? ` · next leg ${km} km` : ''}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left font-normal"></th>
            <th className="text-right font-normal">Without Remal</th>
            <th className="text-right font-normal">With Remal</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Haul distance" base={`${result.km.baseline} km`} remal={`${result.km.remal} km`} />
          <Row label="Haulage" base={egp(result.baseline_egp.haul)} remal={egp(result.cost_egp.haul)} />
          <Row label="Gate fee" base={egp(result.baseline_egp.gate_fee)} remal={egp(result.cost_egp.gate_fee)} />
          <Row
            label="Gravel resale"
            base={`− ${egp(result.baseline_egp.resale)}`}
            remal={`− ${egp(result.cost_egp.resale)}`}
          />
          <Row label="Net cost" base={egp(result.baseline_egp.net)} remal={egp(result.cost_egp.net)} strong />
        </tbody>
      </table>

      {tri && (
        <div className="rounded-lg bg-amber-400/10 p-3 text-amber-200">
          Saves <b>{egp(result.savings_egp)}</b> in haulage ({result.savings_pct}%) and avoids{' '}
          <b>{result.co2_kg_avoided} kg</b> CO₂.
        </div>
      )}

      <p className="text-[11px] leading-snug text-slate-500">
        Modeled estimate: 35 EGP/km, 20 t trucks, road km = 1.3× straight-line, placeholder gate fees and gravel
        prices. Not measured data.
      </p>
    </div>
  )
}