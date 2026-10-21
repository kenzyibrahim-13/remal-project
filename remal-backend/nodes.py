# nodes.py

NODES = [
    # Demolition sites (Supply)
    {"id": "d1", "type": "demolition", "name": "Downtown Cairo (Abdeen)", "lat": 30.0444, "lng": 31.2357},
    {"id": "d2", "type": "demolition", "name": "Nasr City Demolition Zone", "lat": 30.0609, "lng": 31.3397},
    {"id": "d3", "type": "demolition", "name": "Giza Square Urban Renewal", "lat": 30.0131, "lng": 31.2089},
    {"id": "d4", "type": "demolition", "name": "Shubra Industrial Site", "lat": 30.1286, "lng": 31.2422},
    {"id": "d5", "type": "demolition", "name": "Maadi Corniche Reconstruction", "lat": 29.9602, "lng": 31.2569},
    {"id": "d6", "type": "demolition", "name": "Heliopolis Retrofit Site", "lat": 30.0894, "lng": 31.3285},
    {"id": "d7", "type": "demolition", "name": "Helwan Old Quarry Excavation", "lat": 29.8415, "lng": 31.3008},

    # Recycling plants (Crushers)
    {"id": "c1", "type": "crusher", "name": "Obour Recycling & Crushing Plant", "lat": 30.2300, "lng": 31.4750, "gate_fee": 180, "gravel_price": 130},
    {"id": "c2", "type": "crusher", "name": "Katameya Eco-Crusher Station", "lat": 29.9850, "lng": 31.4320, "gate_fee": 195, "gravel_price": 140},
    {"id": "c3", "type": "crusher", "name": "6th of October Waste Processing", "lat": 29.9380, "lng": 30.9150, "gate_fee": 175, "gravel_price": 125},
    {"id": "c4", "type": "crusher", "name": "10th of Ramadan Aggregate Plant", "lat": 30.3120, "lng": 31.7420, "gate_fee": 160, "gravel_price": 120},
    {"id": "c5", "type": "crusher", "name": "Badr City Circular Material Hub", "lat": 30.1410, "lng": 31.7290, "gate_fee": 170, "gravel_price": 135},
    {"id": "c6", "type": "crusher", "name": "Helwan Heavy Rubble Crusher", "lat": 29.8120, "lng": 31.3520, "gate_fee": 185, "gravel_price": 130},

    # Road & infrastructure projects (Demand)
    {"id": "r1", "type": "road", "name": "New Capital Access Corridor", "lat": 30.0200, "lng": 31.7400, "demand_tons": 600},
    {"id": "r2", "type": "road", "name": "Middle Ring Road Extension (East)", "lat": 29.9500, "lng": 31.5500, "demand_tons": 450},
    {"id": "r3", "type": "road", "name": "Regional Ring Road Junction (West)", "lat": 30.0650, "lng": 30.7800, "demand_tons": 800},
    {"id": "r4", "type": "road", "name": "Suez Desert Highway Expansion", "lat": 30.1050, "lng": 31.6200, "demand_tons": 500},
    {"id": "r5", "type": "road", "name": "Ain Sokhna Highway Link", "lat": 29.8200, "lng": 31.6800, "demand_tons": 350},
    {"id": "r6", "type": "road", "name": "Ismailia Desert Sub-base Project", "lat": 30.2800, "lng": 31.6500, "demand_tons": 400},
    {"id": "r7", "type": "road", "name": "Zayed Central Spine Road Project", "lat": 30.0350, "lng": 30.9850, "demand_tons": 300}
]

def get_nodes():
    return NODES

def find_node(node_id: str):
    for node in NODES:
        if node["id"] == node_id:
            return node
    return None