import { FALLBACK_NODES } from './nodes.js'
import { localMatch } from './localMatch.js'
import { classifyImageFile } from './classify.js'

const BASE = import.meta.env?.VITE_API_URL ?? '/api'
const TIMEOUT_MS = 2500

async function fetchJson(url, options = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** GET /api/nodes -> { nodes, source: 'api' | 'local' } */
export async function getNodes() {
  try {
    const data = await fetchJson(`${BASE}/nodes`)
    const nodes = Array.isArray(data) ? data : data.nodes
    if (!Array.isArray(nodes) || nodes.length === 0) throw new Error('empty nodes')
    return { nodes, source: 'api' }
  } catch {
    return { nodes: FALLBACK_NODES, source: 'local' }
  }
}

/** POST /api/match -> { result, source }. Falls back to the local engine on any failure. */
export async function postMatch(body, nodes) {
  try {
    const result = await fetchJson(`${BASE}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!result?.site_id || !result?.plant_id) throw new Error('bad match payload')
    return { result, source: 'api' }
  } catch {
    return { result: localMatch(body, nodes), source: 'local' }
  }
}

/**
 * Grade a rubble photo. Tries POST /api/classify (multipart field "file") so a
 * backend vision model can take over; otherwise uses the offline visual estimate.
 * Returns { purity, breakdown?, suggested?, method } or null if unreadable.
 */
export async function classifyPhoto(file) {
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await fetchJson(`${BASE}/classify`, { method: 'POST', body: form })
    if (typeof res?.purity === 'number') return { ...res, method: 'api' }
  } catch {
    // no backend or no endpoint: fall through to the offline estimate
  }
  try {
    return await classifyImageFile(file)
  } catch {
    return null
  }
}

/** Resolve ids in a match result to full node objects for drawing. */
export function hydrate(result, nodes) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const site = byId[result.site_id]
  const plant = byId[result.plant_id]
  const road = result.road_id ? byId[result.road_id] : null
  const route = road ? [site, plant, road, site] : [site, plant, site]
  return { ...result, site, plant, road, route, byId }
}
