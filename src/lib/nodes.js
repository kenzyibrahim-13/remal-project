// 20 PLACEHOLDER Greater Cairo nodes for the demo.
//
// !! Coordinates are APPROXIMATE (district-level) and every fee, price and
// !! demand figure below is a PLACEHOLDER. Verify coordinates on Google Maps
// !! and replace the numbers with real market data before you quote them to judges.
//
// type: 'demolition' (red) | 'crusher' (green) | 'road' (blue)
// Crushers carry: gate_fee (EGP/ton, within the 150-250 range from the roadmap)
//                 gravel_price (EGP/ton of recycled sub-base)  <- placeholder
// Roads carry:    demand_tons (recycled sub-base needed)       <- placeholder

export const FALLBACK_NODES = [
  // ---- Demolition sites (red) ----
  { id: 'd1', type: 'demolition', name: 'Downtown Cairo (Abdeen)', lat: 30.0444, lng: 31.2357 },
  { id: 'd2', type: 'demolition', name: 'Nasr City', lat: 30.0626, lng: 31.33 },
  { id: 'd3', type: 'demolition', name: 'Dokki, Giza', lat: 30.038, lng: 31.212 },
  { id: 'd4', type: 'demolition', name: '6th of October City', lat: 29.938, lng: 30.926 },
  { id: 'd5', type: 'demolition', name: 'Heliopolis', lat: 30.091, lng: 31.322 },
  { id: 'd6', type: 'demolition', name: 'Maadi', lat: 29.96, lng: 31.257 },
  { id: 'd7', type: 'demolition', name: 'Shubra El Kheima', lat: 30.1286, lng: 31.2422 },
  { id: 'd8', type: 'demolition', name: 'Mokattam', lat: 30.02, lng: 31.3 },
  { id: 'd9', type: 'demolition', name: 'Faisal, Giza', lat: 29.995, lng: 31.15 },

  // ---- C&D recycling plants / crushers (green) ----
  { id: 'c1', type: 'crusher', name: 'Obour Recycling Plant', lat: 30.23, lng: 31.475, gate_fee: 190, gravel_price: 130 },
  { id: 'c2', type: 'crusher', name: 'Katameya Crusher', lat: 30.01, lng: 31.43, gate_fee: 200, gravel_price: 130 },
  { id: 'c3', type: 'crusher', name: '6th Oct Industrial Crusher', lat: 29.93, lng: 30.88, gate_fee: 190, gravel_price: 130 },
  { id: 'c4', type: 'crusher', name: 'Badr City Plant', lat: 30.16, lng: 31.62, gate_fee: 195, gravel_price: 130 },
  { id: 'c5', type: 'crusher', name: 'Helwan Crusher', lat: 29.85, lng: 31.334, gate_fee: 195, gravel_price: 130 },

  // ---- Active road / infrastructure projects (blue) ----
  { id: 'r1', type: 'road', name: 'New Capital Access Road', lat: 30.02, lng: 31.74, demand_tons: 400 },
  { id: 'r2', type: 'road', name: 'Regional Ring Road (East)', lat: 30.13, lng: 31.5, demand_tons: 300 },
  { id: 'r3', type: 'road', name: 'Ain Sokhna Road Upgrade', lat: 30.0, lng: 31.6, demand_tons: 250 },
  { id: 'r4', type: 'road', name: 'Cairo-Alex Desert Road', lat: 30.0, lng: 30.85, demand_tons: 350 },
  { id: 'r5', type: 'road', name: 'Ring Road South Widening', lat: 29.9, lng: 31.35, demand_tons: 200 },
  { id: 'r6', type: 'road', name: 'Sheikh Zayed Link Road', lat: 30.04, lng: 30.98, demand_tons: 280 },
]

export const TYPE_META = {
  demolition: { label: 'Demolition site', color: '#ef4444' },
  crusher: { label: 'Recycling plant', color: '#22c55e' },
  road: { label: 'Road project', color: '#3b82f6' },
}
