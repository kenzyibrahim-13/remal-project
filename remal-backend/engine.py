# engine.py
import math
from nodes import NODES, find_node

TRUCKING_RATE = 35.0         # 35 EGP/km
TRUCK_CAPACITY = 20.0        # 20 tons per standard Egyptian heavy dump truck
ROAD_FACTOR = 1.3            # Driving distance assumption (Haversine * 1.3)
CO2_FACTOR = 0.94            # 0.94 kg CO2 per saved road km

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0  # Earth's radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c * ROAD_FACTOR, 1)

def calculate_match(site_id: str, tons: float, composition: str = "Pure concrete"):
    site = find_node(site_id)
    if not site or site["type"] != "demolition":
        raise ValueError(f"Invalid demolition site ID: {site_id}")

    trips = math.ceil(tons / TRUCK_CAPACITY)
    crushers = [n for n in NODES if n["type"] == "crusher"]
    roads = [n for n in NODES if n["type"] == "road"]

    candidates = []

    for c in crushers:
        d_SP = haversine_km(site["lat"], site["lng"], c["lat"], c["lng"])
        gate_fee_total = c["gate_fee"] * tons

        # Evaluate triangular candidates with roads
        for r in roads:
            d_PD = haversine_km(c["lat"], c["lng"], r["lat"], r["lng"])
            
            # Skip roads farther than 60 km from crusher
            if d_PD > 60.0:
                continue

            d_DS = haversine_km(r["lat"], r["lng"], site["lat"], site["lng"])

            backhaul_trips = trips
            remal_km = round(trips * (d_SP + d_PD + d_DS), 1)
            baseline_km = round(trips * (2 * d_SP + 2 * d_PD), 1)

            saved_km = round(baseline_km - remal_km, 1)
            savings_egp = round(backhaul_trips * (d_SP + d_PD - d_DS) * TRUCKING_RATE)

            haul_cost = round(remal_km * TRUCKING_RATE)
            resale_value = round(c["gravel_price"] * tons)
            net_cost = round(haul_cost + gate_fee_total - resale_value)

            baseline_haul = round(baseline_km * TRUCKING_RATE)
            baseline_net = round(baseline_haul + gate_fee_total - resale_value)

            savings_pct = round((savings_egp / baseline_net) * 100, 1) if baseline_net > 0 else 0.0
            co2_kg = round(saved_km * CO2_FACTOR)

            candidates.append({
                "mode": "triangular",
                "site_id": site["id"],
                "plant_id": c["id"],
                "road_id": r["id"],
                "legs": [
                    {"from_id": site["id"], "to_id": c["id"], "km": d_SP},
                    {"from_id": c["id"], "to_id": r["id"], "km": d_PD},
                    {"from_id": r["id"], "to_id": site["id"], "km": d_DS}
                ],
                "trips": trips,
                "backhaul_trips": backhaul_trips,
                "km": {"remal": remal_km, "baseline": baseline_km},
                "cost_egp": {
                    "haul": haul_cost,
                    "gate_fee": gate_fee_total,
                    "resale": resale_value,
                    "net": net_cost
                },
                "baseline_egp": {
                    "haul": baseline_haul,
                    "gate_fee": gate_fee_total,
                    "resale": resale_value,
                    "net": baseline_net
                },
                "savings_egp": max(0, savings_egp),
                "savings_pct": max(0.0, savings_pct),
                "tons_diverted": tons,
                "co2_kg_avoided": max(0, co2_kg),
                "_net_rank": net_cost
            })

    # Return best triangular route sorted by lowest net cost
    if candidates:
        candidates.sort(key=lambda x: x["_net_rank"])
        best = candidates[0]
        del best["_net_rank"]
        return best

    # Fallback: Plant-only route (if no road matches under 60 km)
    cheapest_plant = None
    min_net = float("inf")
    for c in crushers:
        d_SP = haversine_km(site["lat"], site["lng"], c["lat"], c["lng"])
        total_km = round(trips * 2 * d_SP, 1)
        haul_cost = round(total_km * TRUCKING_RATE)
        gate_fee_total = c["gate_fee"] * tons
        net = haul_cost + gate_fee_total
        if net < min_net:
            min_net = net
            cheapest_plant = (c, d_SP, total_km, haul_cost, gate_fee_total, net)

    c, d_SP, total_km, haul_cost, gate_fee_total, net = cheapest_plant
    return {
        "mode": "plant_only",
        "site_id": site["id"],
        "plant_id": c["id"],
        "road_id": None,
        "legs": [
            {"from_id": site["id"], "to_id": c["id"], "km": d_SP},
            {"from_id": c["id"], "to_id": site["id"], "km": d_SP}
        ],
        "trips": trips,
        "backhaul_trips": 0,
        "km": {"remal": total_km, "baseline": total_km},
        "cost_egp": {
            "haul": haul_cost,
            "gate_fee": gate_fee_total,
            "resale": 0,
            "net": net
        },
        "baseline_egp": {
            "haul": haul_cost,
            "gate_fee": gate_fee_total,
            "resale": 0,
            "net": net
        },
        "savings_egp": 0,
        "savings_pct": 0.0,
        "tons_diverted": tons,
        "co2_kg_avoided": 0
    }