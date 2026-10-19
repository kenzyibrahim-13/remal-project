import { roadKm } from './geo.js'

// Model parameters. Rate and fee range come from the roadmap; the rest are
// ASSUMPTIONS to state honestly in the pitch (or replace with real figures).
export const PARAMS = {
  truckRate: 35, // EGP per km (roadmap figure)
  truckCapacity: 20, // tons per truck load (assumption)
  maxBackhaulKm: 60, // plant -> road project cap (assumption)
  co2KgPerKm: 0.94, // loaded diesel heavy truck, ~35 L/100 km x 2.68 kg CO2/L (assumption)
}

const round = (x) => Math.round(x)
const round1 = (x) => Math.round(x * 10) / 10

/**
 * Local mirror of POST /api/match. Same input and output shape as the API
 * contract in CONTRACT.md, so the UI works identically with or without the backend.
 *
 * Triangular backhaul: Site -> Plant -> Road project -> Site.
 *  - Baseline (no backhaul): demolition truck goes S->P->S (empty return) AND a
 *    separate truck delivers the gravel P->D->P.
 *  - Remal: the same truck that dropped rubble loads gravel and carries it to D,
 *    then returns to S. Only haul distance differs; gate fee and resale are identical.
 *  - If no road project is in range, fall back to the cheapest plant-only route.
 */
export function localMatch({ site_id, tons }, nodes) {
  const site = nodes.find((n) => n.id === site_id)
  if (!site) throw new Error(`Unknown site ${site_id}`)

  const { truckRate: rate, truckCapacity: cap, maxBackhaulKm, co2KgPerKm } = PARAMS
  const plants = nodes.filter((n) => n.type === 'crusher')
  const roads = nodes.filter((n) => n.type === 'road' && n.demand_tons > 0)
  const trips = Math.max(1, Math.ceil(tons / cap))

  let bestTri = null
  let bestPlantOnly = null

  for (const p of plants) {
    const dSP = roadKm(site, p)
    const gate = p.gate_fee * tons

    const poKm = 2 * trips * dSP
    const poNet = poKm * rate + gate
    if (!bestPlantOnly || poNet < bestPlantOnly.net) {
      bestPlantOnly = { p, dSP, km: poKm, gate, net: poNet }
    }

    for (const d of roads) {
      const dPD = roadKm(p, d)
      if (dPD > maxBackhaulKm) continue
      const dDS = roadKm(d, site)
      const gravel = Math.min(tons, d.demand_tons)
      const bh = Math.min(trips, Math.max(1, Math.ceil(gravel / cap))) // trips that carry gravel

      const triKm = (2 * trips - bh) * dSP + bh * (dPD + dDS)
      const baseKm = 2 * trips * dSP + 2 * bh * dPD
      const resale = gravel * p.gravel_price
      const net = triKm * rate + gate - resale

      if (!bestTri || net < bestTri.net) {
        bestTri = { p, d, dSP, dPD, dDS, gravel, bh, triKm, baseKm, resale, gate, net }
      }
    }
  }

  if (bestTri) {
    const t = bestTri
    const baselineHaul = t.baseKm * rate
    const haul = t.triKm * rate
    const savingsEgp = baselineHaul - haul
    const savedKm = t.baseKm - t.triKm
    return {
      mode: 'triangular',
      site_id,
      plant_id: t.p.id,
      road_id: t.d.id,
      legs: [
        { from_id: site_id, to_id: t.p.id, km: round1(t.dSP) },
        { from_id: t.p.id, to_id: t.d.id, km: round1(t.dPD) },
        { from_id: t.d.id, to_id: site_id, km: round1(t.dDS) },
      ],
      trips,
      backhaul_trips: t.bh,
      km: { remal: round1(t.triKm), baseline: round1(t.baseKm) },
      cost_egp: { haul: round(haul), gate_fee: round(t.gate), resale: round(t.resale), net: round(haul + t.gate - t.resale) },
      baseline_egp: { haul: round(baselineHaul), gate_fee: round(t.gate), resale: round(t.resale), net: round(baselineHaul + t.gate - t.resale) },
      savings_egp: round(savingsEgp),
      savings_pct: baselineHaul > 0 ? round1((savingsEgp / baselineHaul) * 100) : 0,
      tons_diverted: tons,
      co2_kg_avoided: round(savedKm * co2KgPerKm),
    }
  }

  // Fallback: no road project in range -> plant-only
  const o = bestPlantOnly
  return {
    mode: 'plant_only',
    site_id,
    plant_id: o.p.id,
    road_id: null,
    legs: [
      { from_id: site_id, to_id: o.p.id, km: round1(o.dSP) },
      { from_id: o.p.id, to_id: site_id, km: round1(o.dSP) },
    ],
    trips,
    backhaul_trips: 0,
    km: { remal: round1(o.km), baseline: round1(o.km) },
    cost_egp: { haul: round(o.km * rate), gate_fee: round(o.gate), resale: 0, net: round(o.km * rate + o.gate) },
    baseline_egp: { haul: round(o.km * rate), gate_fee: round(o.gate), resale: 0, net: round(o.km * rate + o.gate) },
    savings_egp: 0,
    savings_pct: 0,
    tons_diverted: tons,
    co2_kg_avoided: 0,
  }
}
