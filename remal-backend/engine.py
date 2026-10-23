# engine.py
import math
from nodes import NODES, find_node

# Model parameters matching localMatch.js exactly
PARAMS = {
    "truckRate": 35.0,        # EGP per km
    "truckCapacity": 20.0,    # tons per truck load
    "maxBackhaulKm": 60.0,    # plant -> road project cutoff
    "co2KgPerKm": 0.94        # kg CO2 per saved road km
}

ROAD_FACTOR = 1.3

def round_num(x: float) -> int:
    # Python round() uses round-half-to-even; Math.floor(x + 0.5) mirrors JS Math.round(x)
    return math.floor(x + 0.5)

def round1(x: float) -> float:
    return math.floor(x * 10.0 + 0.5) / 10.0

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round1(R * c * ROAD_FACTOR)

def road_km(node1: dict, node2: dict) -> float:
    return haversine_km(node1["lat"], node1["lng"], node2["lat"], node2["lng"])

def calculate_match(site_id: str, tons: float, composition: str = "Pure concrete"):
    site = find_node(site_id)
    if not site:
        raise ValueError(f"Unknown site {site_id}")

    rate = PARAMS["truckRate"]
    cap = PARAMS["truckCapacity"]
    max_backhaul_km = PARAMS["maxBackhaulKm"]
    co2_kg_per_km = PARAMS["co2KgPerKm"]

    plants = [n for n in NODES if n["type"] == "crusher"]
    roads = [n for n in NODES if n["type"] == "road" and n.get("demand_tons", 0) > 0]
    trips = max(1, math.ceil(tons / cap))

    best_tri = None
    best_plant_only = None

    for p in plants:
        d_SP = road_km(site, p)
        gate = p["gate_fee"] * tons

        po_km = 2.0 * trips * d_SP
        po_net = po_km * rate + gate
        if not best_plant_only or po_net < best_plant_only["net"]:
            best_plant_only = {
                "p": p,
                "d_SP": d_SP,
                "km": po_km,
                "gate": gate,
                "net": po_net
            }

        for d in roads:
            d_PD = road_km(p, d)
            if d_PD > max_backhaul_km:
                continue

            d_DS = road_km(d, site)
            gravel = min(tons, d["demand_tons"])
            bh = min(trips, max(1, math.ceil(gravel / cap)))

            tri_km = (2.0 * trips - bh) * d_SP + bh * (d_PD + d_DS)
            base_km = 2.0 * trips * d_SP + 2.0 * bh * d_PD
            resale = gravel * p["gravel_price"]
            net = tri_km * rate + gate - resale

            if not best_tri or net < best_tri["net"]:
                best_tri = {
                    "p": p,
                    "d": d,
                    "d_SP": d_SP,
                    "d_PD": d_PD,
                    "d_DS": d_DS,
                    "gravel": gravel,
                    "bh": bh,
                    "tri_km": tri_km,
                    "base_km": base_km,
                    "resale": resale,
                    "gate": gate,
                    "net": net
                }

    if best_tri:
        t = best_tri
        baseline_haul = t["base_km"] * rate
        haul = t["tri_km"] * rate
        savings_egp = baseline_haul - haul
        saved_km = t["base_km"] - t["tri_km"]

        return {
            "mode": "triangular",
            "site_id": site_id,
            "plant_id": t["p"]["id"],
            "road_id": t["d"]["id"],
            "legs": [
                {"from_id": site_id, "to_id": t["p"]["id"], "km": round1(t["d_SP"])},
                {"from_id": t["p"]["id"], "to_id": t["d"]["id"], "km": round1(t["d_PD"])},
                {"from_id": t["d"]["id"], "to_id": site_id, "km": round1(t["d_DS"])}
            ],
            "trips": trips,
            "backhaul_trips": t["bh"],
            "km": {"remal": round1(t["tri_km"]), "baseline": round1(t["base_km"])},
            "cost_egp": {
                "haul": round_num(haul),
                "gate_fee": round_num(t["gate"]),
                "resale": round_num(t["resale"]),
                "net": round_num(haul + t["gate"] - t["resale"])
            },
            "baseline_egp": {
                "haul": round_num(baseline_haul),
                "gate_fee": round_num(t["gate"]),
                "resale": round_num(t["resale"]),
                "net": round_num(baseline_haul + t["gate"] - t["resale"])
            },
            "savings_egp": round_num(savings_egp),
            "savings_pct": round1((savings_egp / baseline_haul) * 100.0) if baseline_haul > 0 else 0.0,
            "tons_diverted": tons,
            "co2_kg_avoided": round_num(saved_km * co2_kg_per_km)
        }

    # Fallback: Plant-only
    o = best_plant_only
    total_km = round1(o["km"])
    po_haul = round_num(o["km"] * rate)
    po_net = round_num(o["km"] * rate + o["gate"])

    return {
        "mode": "plant_only",
        "site_id": site_id,
        "plant_id": o["p"]["id"],
        "road_id": None,
        "legs": [
            {"from_id": site_id, "to_id": o["p"]["id"], "km": round1(o["d_SP"])},
            {"from_id": o["p"]["id"], "to_id": site_id, "km": round1(o["d_SP"])}
        ],
        "trips": trips,
        "backhaul_trips": 0,
        "km": {"remal": total_km, "baseline": total_km},
        "cost_egp": {
            "haul": po_haul,
            "gate_fee": round_num(o["gate"]),
            "resale": 0,
            "net": po_net
        },
        "baseline_egp": {
            "haul": po_haul,
            "gate_fee": round_num(o["gate"]),
            "resale": 0,
            "net": po_net
        },
        "savings_egp": 0,
        "savings_pct": 0.0,
        "tons_diverted": tons,
        "co2_kg_avoided": 0
    }