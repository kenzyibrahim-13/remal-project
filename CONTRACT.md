# Remal API contract (frontend <-> backend)

The frontend already works without a backend (offline engine in `src/lib/localMatch.js`).
When Member 1's FastAPI is running on `:8000`, Vite proxies `/api/*` to it and the header
badge switches from "Offline mode" to "Live API". Anything that fails or times out (2.5 s)
silently falls back to the local engine.

## GET /api/nodes

Returns an array (or `{ "nodes": [...] }`):

```json
[
  { "id": "d1", "type": "demolition", "name": "Downtown Cairo (Abdeen)", "lat": 30.0444, "lng": 31.2357 },
  { "id": "c1", "type": "crusher", "name": "Obour Recycling Plant", "lat": 30.23, "lng": 31.475, "gate_fee": 180, "gravel_price": 130 },
  { "id": "r1", "type": "road", "name": "New Capital Access Road", "lat": 30.02, "lng": 31.74, "demand_tons": 400 }
]
```

`type` is one of `demolition` | `crusher` | `road`. Ids must be stable strings.

## POST /api/match

Request:

```json
{ "site_id": "d1", "tons": 40, "composition": "Pure concrete" }
```

Response (frontend resolves coordinates from the ids, so no lat/lng needed):

```json
{
  "mode": "triangular",
  "site_id": "d1",
  "plant_id": "c2",
  "road_id": "r3",
  "legs": [
    { "from_id": "d1", "to_id": "c2", "km": 27.4 },
    { "from_id": "c2", "to_id": "r3", "km": 18.1 },
    { "from_id": "r3", "to_id": "d1", "km": 30.2 }
  ],
  "trips": 2,
  "backhaul_trips": 2,
  "km": { "remal": 151.4, "baseline": 182.0 },
  "cost_egp": { "haul": 5299, "gate_fee": 8800, "resale": 5600, "net": 8499 },
  "baseline_egp": { "haul": 6370, "gate_fee": 8800, "resale": 5600, "net": 9570 },
  "savings_egp": 1071,
  "savings_pct": 16.8,
  "tons_diverted": 40,
  "co2_kg_avoided": 29
}
```

(Numbers above are illustrative.)

- `mode`: `"triangular"` or `"plant_only"`. For `plant_only`, `road_id` is `null`, `legs` has
  2 entries (S->P, P->S), and `savings_egp`/`co2_kg_avoided` are 0.
- Required fields the UI reads: `mode, site_id, plant_id, road_id, legs, trips, km, cost_egp,
  baseline_egp, savings_egp, savings_pct, tons_diverted, co2_kg_avoided`.

## POST /api/classify (optional)

Multipart form, field `file` = the rubble photo. If this endpoint answers within 2.5 s the UI
uses it instead of the offline colour-based estimate; any error silently falls back.

```json
{ "purity": 85, "breakdown": { "concrete": 85, "masonry": 10, "asphalt": 3, "other": 2 }, "suggested": "Pure concrete" }
```

Only `purity` (0-100) is required. `suggested` must be one of `Pure concrete`, `Mixed masonry`,
`Asphalt`, `Mixed C&D` to auto-fill the composition dropdown. `purity` is also sent in the
`POST /api/match` body when a photo was graded (optional field, not used by the cost model).

## Cost model (must match `localMatch.js` so numbers agree online and offline)

- Baseline = demolition truck S->P->S (empty return) + a separate gravel truck P->D->P.
- Remal = same truck carries gravel P->D, then returns D->S.
- `savings = backhaul_trips * (d(S,P) + d(P,D) - d(D,S)) * 35 EGP/km`.
- Gate fee and gravel resale are identical in both columns, so they cancel in the savings.
- Candidates are ranked by `net = haul + gate_fee*tons - resale`; roads farther than 60 km
  from the plant are skipped; with no eligible road, return the cheapest `plant_only` route.
- Road km = haversine x 1.3 (assumption). CO2 = saved km x 0.94 kg/km (assumption).
