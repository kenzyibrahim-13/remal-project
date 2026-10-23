import { useState } from 'react'

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
  // State for Telegram driver dispatch
  const [chatId, setChatId] = useState('')
  const [dispatchStatus, setDispatchStatus] = useState('idle') // 'idle' | 'loading' | 'sent' | 'error'

  const handleDispatch = async () => {
    if (!result || !chatId.trim()) return

    setDispatchStatus('loading')
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_telegram_chat_id: Number(chatId.trim()),
          match_result: result,
        }),
      })

      if (res.ok) {
        setDispatchStatus('sent')
        setTimeout(() => setDispatchStatus('idle'), 5000)
      } else {
        setDispatchStatus('error')
        setTimeout(() => setDispatchStatus('idle'), 4000)
      }
    } catch (err) {
      console.error('Dispatch failed:', err)
      setDispatchStatus('error')
      setTimeout(() => setDispatchStatus('idle'), 4000)
    }
  }

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
        ['Pickup', result.site?.name || 'Demolition Site', result.legs[0]?.km],
        ['Drop rubble', result.plant?.name || 'Crusher Plant', result.legs[1]?.km],
        ['Deliver gravel', result.road?.name || 'Road Project', result.legs[2]?.km],
      ]
    : [
        ['Pickup', result.site?.name || 'Demolition Site', result.legs[0]?.km],
        ['Drop rubble', result.plant?.name || 'Crusher Plant', null],
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

      {/* Driver Dispatch Section via Telegram */}
      <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-800/40 p-3 space-y-2">
        <label className="block text-xs font-medium text-slate-300">
          Driver Telegram Dispatch (No-App Interface)[cite: 14]
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Driver Telegram Chat ID (e.g. from @userinfobot)"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            onClick={handleDispatch}
            disabled={dispatchStatus === 'loading' || !chatId.trim()}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
              dispatchStatus === 'sent'
                ? 'bg-emerald-600 text-white'
                : dispatchStatus === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50'
            }`}
          >
            {dispatchStatus === 'loading' && 'Dispatching...'}
            {dispatchStatus === 'sent' && '✓ Dispatched to Telegram'}
            {dispatchStatus === 'error' && '✕ Failed'}
            {dispatchStatus === 'idle' && '📲 Dispatch Driver'}
          </button>
        </div>
      </div>

      <p className="text-[11px] leading-snug text-slate-500">
        Modeled estimate: 35 EGP/km, 20 t trucks, road km = 1.3× straight-line, placeholder gate fees and gravel
        prices[cite: 5, 8]. Not measured data[cite: 1, 8].
      </p>
    </div>
  )
}