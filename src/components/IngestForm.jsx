import { useEffect, useState } from 'react'
import { classifyPhoto } from '../lib/api.js'

const COMPOSITIONS = ['Pure concrete', 'Mixed masonry', 'Asphalt', 'Mixed C&D']

const field =
  'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400'

const SEGMENTS = [
  ['concrete', 'Concrete', '#94a3b8'],
  ['masonry', 'Masonry', '#f97316'],
  ['asphalt', 'Asphalt', '#475569'],
  ['other', 'Other', '#a16207'],
]

function GradeBadge({ grading, grade, failed }) {
  if (grading) return <p className="mt-2 text-xs text-slate-400">Analysing photo…</p>
  if (failed)
    return (
      <p className="mt-2 text-xs text-slate-500">
        Couldn't read rubble in this photo. Pick the composition manually.
      </p>
    )
  if (!grade) return null
  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-800/60 p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-slate-100">
          <b className="text-lg text-amber-300">{grade.purity}%</b> concrete
        </span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {grade.method === 'api' ? 'AI grade' : 'Visual estimate'}
        </span>
      </div>
      {grade.breakdown && (
        <>
          <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-700">
            {SEGMENTS.map(([key, , color]) =>
              grade.breakdown[key] > 0 ? (
                <div key={key} style={{ width: `${grade.breakdown[key]}%`, background: color }} />
              ) : null,
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-400">
            {SEGMENTS.filter(([key]) => grade.breakdown[key] > 0).map(([key, label, color]) => (
              <span key={key}>
                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                {label} {grade.breakdown[key]}%
              </span>
            ))}
          </div>
        </>
      )}
      {grade.method !== 'api' && (
        <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
          Estimated from photo colours, offline. A screening aid, not a lab test.
        </p>
      )}
    </div>
  )
}

export default function IngestForm({ sites, siteId, onSiteChange, onSubmit, loading }) {
  const [tons, setTons] = useState(40)
  const [composition, setComposition] = useState(COMPOSITIONS[0])
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [grade, setGrade] = useState(null)
  const [grading, setGrading] = useState(false)
  const [gradeFailed, setGradeFailed] = useState(false)

  // Object URL for the photo preview; revoke on change/unmount.
  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  // Grade the photo whenever a new one is chosen (ignore stale results).
  useEffect(() => {
    setGrade(null)
    setGradeFailed(false)
    if (!photo) {
      setGrading(false)
      return
    }
    let cancelled = false
    setGrading(true)
    classifyPhoto(photo).then((g) => {
      if (cancelled) return
      setGrading(false)
      if (g) {
        setGrade(g)
        if (g.suggested && COMPOSITIONS.includes(g.suggested)) setComposition(g.suggested)
      } else {
        setGradeFailed(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [photo])

  const valid = siteId && Number(tons) > 0

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid)
          onSubmit({
            site_id: siteId,
            tons: Number(tons),
            composition,
            ...(grade ? { purity: grade.purity } : {}),
          })
      }}
    >
      <div>
        <label className="mb-1 block text-xs text-slate-400">Demolition site</label>
        <select className={field} value={siteId} onChange={(e) => onSiteChange(e.target.value)}>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">Tip: you can also click a red pin on the map.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Rubble (tons)</label>
          <input
            type="number"
            min="1"
            step="1"
            className={field}
            value={tons}
            onChange={(e) => setTons(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Composition</label>
          <select className={field} value={composition} onChange={(e) => setComposition(e.target.value)}>
            {COMPOSITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Rubble photo (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-slate-100 hover:file:bg-slate-600"
        />
        {preview && <img src={preview} alt="Rubble preview" className="mt-2 h-24 w-full rounded-lg object-cover" />}
        {photo && <GradeBadge grading={grading} grade={grade} failed={gradeFailed} />}
      </div>

      <button
        type="submit"
        disabled={!valid || loading || grading}
        className="w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Calculating…' : 'Calculate Best Route'}
      </button>
    </form>
  )
}
