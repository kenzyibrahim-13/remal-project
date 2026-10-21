# main.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from nodes import get_nodes
from engine import calculate_match

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