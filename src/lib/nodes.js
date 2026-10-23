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
  // ==================== GREATER CAIRO & GIZA ====================
  // Demolition Sites (Red)
  { id: "d1", type: "demolition", name: "Downtown Cairo (Abdeen)", lat: 30.0444, lng: 31.2357 },
  { id: "d2", type: "demolition", name: "Nasr City Demolition Zone", lat: 30.0609, lng: 31.3397 },
  { id: "d3", type: "demolition", name: "Giza Square Urban Renewal", lat: 30.0131, lng: 31.2089 },
  { id: "d4", type: "demolition", name: "Shubra Industrial Site", lat: 30.1286, lng: 31.2422 },
  { id: "d5", type: "demolition", name: "Maadi Corniche Reconstruction", lat: 29.9602, lng: 31.2569 },
  { id: "d6", type: "demolition", name: "Heliopolis Retrofit Site", lat: 30.0894, lng: 31.3285 },
  { id: "d7", type: "demolition", name: "Helwan Old Quarry Excavation", lat: 29.8415, lng: 31.3008 },
  { id: "d8", type: "demolition", name: "Magra El-Oyoun Heritage Zone", lat: 30.0168, lng: 31.2384 },
  { id: "d9", type: "demolition", name: "October Gardens Excavation Hub", lat: 29.9125, lng: 31.0214 },
  { id: "d10", type: "demolition", name: "Badr City Industrial Retrofit", lat: 30.1340, lng: 31.7120 },

  // Crushers & Recycling Plants (Green)
  { id: "c1", type: "crusher", name: "Obour Recycling & Crushing Plant", lat: 30.2300, lng: 31.4750, gate_fee: 180, gravel_price: 130 },
  { id: "c2", type: "crusher", name: "Katameya Eco-Crusher Station", lat: 29.9850, lng: 31.4320, gate_fee: 195, gravel_price: 140 },
  { id: "c3", type: "crusher", name: "6th of October Waste Processing", lat: 29.9380, lng: 30.9150, gate_fee: 175, gravel_price: 125 },
  { id: "c4", type: "crusher", name: "10th of Ramadan Aggregate Plant", lat: 30.3120, lng: 31.7420, gate_fee: 160, gravel_price: 120 },
  { id: "c5", type: "crusher", name: "Badr City Circular Material Hub", lat: 30.1410, lng: 31.7290, gate_fee: 170, gravel_price: 135 },
  { id: "c6", type: "crusher", name: "15th of May Municipal Crusher", lat: 29.8520, lng: 31.3910, gate_fee: 165, gravel_price: 135 },

  // Road & Infrastructure Projects (Blue)
  { id: "r1", type: "road", name: "New Capital Access Corridor", lat: 30.0200, lng: 31.7400, demand_tons: 600 },
  { id: "r2", type: "road", name: "Middle Ring Road Extension (East)", lat: 29.9500, lng: 31.5500, demand_tons: 450 },
  { id: "r3", type: "road", name: "Regional Ring Road Junction (West)", lat: 30.0650, lng: 30.7800, demand_tons: 800 },
  { id: "r4", type: "road", name: "Suez Desert Highway Expansion", lat: 30.1050, lng: 31.6200, demand_tons: 500 },
  { id: "r5", type: "road", name: "Zayed Central Spine Project", lat: 30.0350, lng: 30.9850, demand_tons: 300 },

  // ==================== ALEXANDRIA & NORTH COAST ====================
  { id: "d11", type: "demolition", name: "Alexandria West Port Demolition", lat: 31.1825, lng: 29.8654 },
  { id: "d12", type: "demolition", name: "El Max Industrial Site", lat: 31.1550, lng: 29.8320 },
  { id: "c7", type: "crusher", name: "Amreya Heavy Aggregate Crusher", lat: 31.0250, lng: 29.8050, gate_fee: 170, gravel_price: 130 },
  { id: "c8", type: "crusher", name: "Borg El Arab Circular Plant", lat: 30.9120, lng: 29.5840, gate_fee: 160, gravel_price: 125 },
  { id: "r6", type: "road", name: "Alexandria Coastal Highway Widening", lat: 31.2150, lng: 29.9520, demand_tons: 700 },
  { id: "r7", type: "road", name: "New Alamein Sub-base Corridor", lat: 30.8350, lng: 28.9510, demand_tons: 1200 },

  // ==================== NILE DELTA REGION ====================
  { id: "d13", type: "demolition", name: "Tanta City Central Renewal", lat: 30.7885, lng: 31.0019 },
  { id: "d14", type: "demolition", name: "Mansoura Nile Waterfront Site", lat: 31.0364, lng: 31.3807 },
  { id: "c9", type: "crusher", name: "Quwaysna Industrial Recycling Hub", lat: 30.5620, lng: 31.1480, gate_fee: 155, gravel_price: 120 },
  { id: "c10", type: "crusher", name: "Mahalla Industrial Aggregate Plant", lat: 30.9750, lng: 31.1620, gate_fee: 150, gravel_price: 115 },
  { id: "r8", type: "road", name: "Banha–Tanta Regional Expressway", lat: 30.6200, lng: 31.1020, demand_tons: 650 },
  { id: "r9", type: "road", name: "International Coastal Road Delta Sector", lat: 31.4210, lng: 31.1520, demand_tons: 850 },

  // ==================== CANAL CITIES & SUEZ CANAL ZONE ====================
  { id: "d15", type: "demolition", name: "Port Said East Port Logistics Site", lat: 31.2480, lng: 32.3210 },
  { id: "d16", type: "demolition", name: "Suez Port Demolition Area", lat: 29.9650, lng: 32.5510 },
  { id: "c11", type: "crusher", name: "Ismailia Technology Zone Recycling", lat: 30.6020, lng: 32.2740, gate_fee: 165, gravel_price: 125 },
  { id: "c12", type: "crusher", name: "Ain Sokhna Industrial Complex Crusher", lat: 29.6210, lng: 32.3520, gate_fee: 185, gravel_price: 140 },
  { id: "r10", type: "road", name: "Suez Canal Tunnels Access Link", lat: 30.5210, lng: 32.3350, demand_tons: 900 },
  { id: "r11", type: "road", name: "Ain Sokhna Port Logistics Highway", lat: 29.6800, lng: 32.3100, demand_tons: 1100 },

  // ==================== UPPER EGYPT (NILOTIC CORRIDOR) ====================
  { id: "d17", type: "demolition", name: "Beni Suef Industrial Zone Site", lat: 29.0744, lng: 31.0978 },
  { id: "d18", type: "demolition", name: "Asyut Old City Urban Renewal", lat: 27.1801, lng: 31.1837 },
  { id: "d19", type: "demolition", name: "Aswan Quarry & Urban Retrofit", lat: 24.0889, lng: 32.8998 },
  { id: "c13", type: "crusher", name: "Minya Desert Aggregate Plant", lat: 28.1090, lng: 30.7500, gate_fee: 145, gravel_price: 110 },
  { id: "c14", type: "crusher", name: "Asyut Eco-Crusher Station", lat: 27.2100, lng: 31.2500, gate_fee: 150, gravel_price: 115 },
  { id: "c15", type: "crusher", name: "Sohag Heavy Material Hub", lat: 26.5580, lng: 31.6950, gate_fee: 155, gravel_price: 120 },
  { id: "r12", type: "road", name: "Western Desert Nile Highway (Minya-Asyut)", lat: 27.8500, lng: 30.8200, demand_tons: 1000 },
  { id: "r13", type: "road", name: "Upper Egypt Eastern Axis Link", lat: 26.1500, lng: 32.7200, demand_tons: 750 },
  { id: "r14", type: "road", name: "Aswan New City Access Arterial", lat: 24.1500, lng: 32.8500, demand_tons: 600 },

  // ==================== RED SEA & SINAI ====================
  { id: "d20", type: "demolition", name: "Hurghada Waterfront Redevelopment", lat: 27.2578, lng: 33.8116 },
  { id: "c16", type: "crusher", name: "Safaga Industrial Quarry Crusher", lat: 26.7450, lng: 33.9310, gate_fee: 175, gravel_price: 130 },
  { id: "r15", type: "road", name: "Red Sea Coastal Highway Duplication", lat: 26.9000, lng: 33.9100, demand_tons: 800 }
];

export const TYPE_META = {
  demolition: { label: 'Demolition site', color: '#ef4444' },
  crusher: { label: 'Recycling plant', color: '#22c55e' },
  road: { label: 'Road project', color: '#3b82f6' },
}
