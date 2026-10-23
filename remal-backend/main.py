# main.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from nodes import find_node, get_nodes
from engine import calculate_match
from telegram_bot import send_dispatch_leg_1, send_dispatch_leg_2, send_completion

app = FastAPI(title="Remal Circular C&D Waste Routing Engine", version="1.0.0")

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MatchRequest(BaseModel):
    site_id: str
    tons: float
    composition: Optional[str] = "Pure concrete"
    purity: Optional[float] = None

class DispatchRequest(BaseModel):
    driver_telegram_chat_id: int
    match_result: dict

@app.get("/")
def root():
    return {"status": "online", "system": "Remal Logistics Engine"}

@app.get("/api/nodes")
def read_nodes():
    return get_nodes()

@app.post("/api/match")
def match_route(req: MatchRequest):
    try:
        result = calculate_match(site_id=req.site_id, tons=req.tons, composition=req.composition)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine computation error: {str(e)}")

@app.post("/api/classify")
async def classify_image(file: UploadFile = File(...)):
    # Member 3 classifier endpoint hook
    # Returns 85% concrete purity demo stub as specified in CONTRACT.md
    return {
        "purity": 85,
        "breakdown": {"concrete": 85, "masonry": 10, "asphalt": 3, "other": 2},
        "suggested": "Pure concrete"
    }

@app.post("/api/dispatch")
async def dispatch_driver(payload: DispatchRequest):
    # Retrieve plant and road nodes using find_node from nodes.py
    plant_id = payload.match_result.get("plant_id")
    road_id = payload.match_result.get("road_id")
    
    plant_node = find_node(plant_id)
    road_node = find_node(road_id)
    
    if not plant_node:
        raise HTTPException(status_code=404, detail="Plant node not found")
        
    await send_dispatch_leg_1(
        chat_id=payload.driver_telegram_chat_id,
        match_result=payload.match_result,
        plant_node=plant_node,
        road_node=road_node
    )
    return {"status": "dispatched", "driver_id": payload.driver_telegram_chat_id}

@app.post("/api/telegram-webhook")
async def telegram_webhook(update: dict):
    callback_query = update.get("callback_query")
    if not callback_query:
        return {"ok": True}
        
    chat_id = callback_query["message"]["chat"]["id"]
    data = callback_query.get("data", "")
    
    if data.startswith("arrived_plant:"):
        trip_id = data.split("arrived_plant:")[1]
        await send_dispatch_leg_2(chat_id, trip_id)
        
    elif data.startswith("finished_road:"):
        trip_id = data.split("finished_road:")[1]
        await send_completion(chat_id, trip_id)
        
    return {"ok": True}