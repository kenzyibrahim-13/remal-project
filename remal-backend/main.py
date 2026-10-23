import base64
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
 
from dotenv import load_dotenv
from engine import calculate_match
from fastapi import FastAPI, File, HTTPException, UploadFile
import httpx
from nodes import find_node, get_nodes
from telegram_bot import send_dispatch_leg_1, send_dispatch_leg_2, send_completion
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
 
# Load environment variables from .env file (if present)
load_dotenv()
 
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("remal")
 
app = FastAPI(title="Remal Circular C&D Waste Routing Engine", version="1.0.0")
 
# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# ---------------------------------------------------------------------------
# OpenRouter configuration
# ---------------------------------------------------------------------------
 
# Never hardcode the key. Put it in .env as: OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
 
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
 
# Free vision models, tried in order when one returns 404 (model retired or no
# image-capable endpoint). Free models change often; override in .env with:
#   OPENROUTER_MODELS=google/gemma-4-31b-it:free,openrouter/free
# A single OPENROUTER_MODEL in .env is still honoured and tried first.
_DEFAULT_MODELS = [
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3.5-super-vl:free",
    "openrouter/free",  # OpenRouter's free router; picks an image-capable free model
]
_env_models = [
    m.strip() for m in os.getenv("OPENROUTER_MODELS", "").split(",") if m.strip()
]
_single = os.getenv("OPENROUTER_MODEL", "").strip()
OPENROUTER_MODELS = list(
    dict.fromkeys(([_single] if _single else []) + (_env_models or _DEFAULT_MODELS))
)
 
# Free vision models routinely take 10-40 s; 8 s was timing out.
OPENROUTER_TIMEOUT = float(os.getenv("OPENROUTER_TIMEOUT", "60"))
 
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB
 
VALID_SUGGESTIONS = {"Pure concrete", "Mixed masonry", "Asphalt", "Mixed C&D"}
 
CLASSIFY_PROMPT = (
    "You are an expert construction and demolition (C&D) waste analyzer. "
    "Analyze this rubble image and estimate the material composition"
    " percentages. Return ONLY a raw JSON object with no markdown"
    " formatting or backticks, matching this exact structure:\n"
    '{"purity": <int 0-100 representing concrete percentage>, '
    '"breakdown": {"concrete": <int>, "masonry": <int>, "asphalt": <int>,'
    ' "other": <int>}, '
    '"suggested": "<must be one of: Pure concrete, Mixed masonry, Asphalt,'
    ' Mixed C&D>"}\n'
    "Rules:\n"
    "1. The 4 numbers in 'breakdown' MUST sum to 100.\n"
    "2. 'purity' MUST equal the 'concrete' percentage.\n"
    "3. Choose 'Pure concrete' if concrete >= 75, 'Mixed masonry' if"
    " masonry is dominant, 'Asphalt' if asphalt is dominant, otherwise"
    " 'Mixed C&D'."
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
    result = calculate_match(
        site_id=req.site_id, tons=req.tons, composition=req.composition
    )
    return result
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
  except Exception as e:
    raise HTTPException(
        status_code=500, detail=f"Engine computation error: {str(e)}"
    )
 
 
# ---------------------------------------------------------------------------
# Vision classification helpers
# ---------------------------------------------------------------------------
 
 
def _build_payload(model: str, data_url: str) -> Dict[str, Any]:
  """OpenRouter chat-completions payload with one text part and one image."""
  return {
      "model": model,
      "messages": [{
          "role": "user",
          # OpenRouter recommends the text part first, then the image.
          "content": [
              {"type": "text", "text": CLASSIFY_PROMPT},
              {"type": "image_url", "image_url": {"url": data_url}},
          ],
      }],
      # Providers that don't support JSON mode ignore this field; the prompt
      # and _extract_json still enforce JSON.
      "response_format": {"type": "json_object"},
      "temperature": 0.1,
      "max_tokens": 400,
  }
 
 
def _openrouter_error(resp: httpx.Response) -> str:
  """Readable message from an OpenRouter error body: {"error": {"message": ...}}."""
  try:
    body = resp.json()
  except ValueError:
    return resp.text[:500] or resp.reason_phrase
  err = body.get("error", body) if isinstance(body, dict) else body
  if isinstance(err, dict):
    msg = err.get("message") or json.dumps(err)
    raw = (err.get("metadata") or {}).get("raw")
    return f"{msg} ({raw})" if raw else msg
  return str(err)
 
 
def _extract_json(text: str) -> Dict[str, Any]:
  """Parse JSON from the reply, tolerating ```json fences or stray prose."""
  text = text.strip()
  fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
  if fenced:
    text = fenced.group(1)
  else:
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
      text = text[start : end + 1]
  parsed = json.loads(text)
  if not isinstance(parsed, dict):
    raise ValueError("model reply is not a JSON object")
  return parsed
 
 
def _normalize(parsed: Dict[str, Any]) -> Dict[str, Any]:
  """Coerce the model output into the CONTRACT.md schema.
 
  Raises ValueError if the reply is missing the breakdown, instead of
  silently inventing numbers.
  """
  breakdown = parsed.get("breakdown")
  if not isinstance(breakdown, dict):
    raise ValueError(f"missing 'breakdown' object in model reply: {parsed}")
 
  keys = ("concrete", "masonry", "asphalt", "other")
  try:
    values = {k: max(0.0, float(breakdown.get(k, 0) or 0)) for k in keys}
  except (TypeError, ValueError):
    raise ValueError(f"non-numeric values in 'breakdown': {breakdown}")
 
  total = sum(values.values())
  if total <= 0:
    raise ValueError(f"'breakdown' percentages sum to 0: {breakdown}")
 
  # Rescale to 100 and round, putting any rounding remainder into 'other'.
  concrete = round(values["concrete"] * 100 / total)
  masonry = round(values["masonry"] * 100 / total)
  asphalt = round(values["asphalt"] * 100 / total)
  other = max(0, 100 - concrete - masonry - asphalt)
 
  suggested = parsed.get("suggested")
  if suggested not in VALID_SUGGESTIONS:
    if concrete >= 75:
      suggested = "Pure concrete"
    elif masonry >= max(concrete, asphalt, other):
      suggested = "Mixed masonry"
    elif asphalt >= max(concrete, masonry, other):
      suggested = "Asphalt"
    else:
      suggested = "Mixed C&D"
 
  return {
      "purity": concrete,
      "breakdown": {
          "concrete": concrete,
          "masonry": masonry,
          "asphalt": asphalt,
          "other": other,
      },
      "suggested": suggested,
  }
 
 
@app.post("/api/classify")
async def classify_image(file: UploadFile = File(...)):
  """Analyzes an uploaded C&D rubble photo via OpenRouter Vision
 
  and returns the exact schema required by CONTRACT.md.
  Errors are raised as HTTPException with OpenRouter's real message.
  """
  if not OPENROUTER_API_KEY:
    raise HTTPException(
        status_code=500,
        detail="OPENROUTER_API_KEY is not set. Add it to your .env file.",
    )
 
  mime_type = (file.content_type or "").lower()
  if mime_type == "image/jpg":
    mime_type = "image/jpeg"
  if mime_type not in ALLOWED_IMAGE_TYPES:
    raise HTTPException(
        status_code=415,
        detail=f"Unsupported image type '{file.content_type}'. Use JPEG, PNG, WebP or GIF.",
    )
 
  image_bytes = await file.read()
  if not image_bytes:
    raise HTTPException(status_code=400, detail="The uploaded file is empty.")
  if len(image_bytes) > MAX_IMAGE_BYTES:
    raise HTTPException(status_code=413, detail="Image is larger than 8 MB.")
 
  # data:<mime>;base64,<data> — standard base64, no line breaks.
  base64_image = base64.b64encode(image_bytes).decode("ascii")
  data_url = f"data:{mime_type};base64,{base64_image}"
 
  headers = {
      "Authorization": f"Bearer {OPENROUTER_API_KEY}",
      "Content-Type": "application/json",
      # Optional attribution headers recommended by OpenRouter.
      "HTTP-Referer": os.getenv("APP_URL", "http://localhost:5173"),
      "X-Title": "Remal",
  }
 
  not_found: List[str] = []
  async with httpx.AsyncClient(timeout=OPENROUTER_TIMEOUT) as client:
    for model in OPENROUTER_MODELS:
      try:
        response = await client.post(
            OPENROUTER_URL, headers=headers, json=_build_payload(model, data_url)
        )
      except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail=f"OpenRouter timed out after {OPENROUTER_TIMEOUT:.0f}s (model {model}).",
        )
      except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Could not reach OpenRouter: {e}")
 
      if response.status_code == 404:
        # Model retired, no image-capable endpoint, or blocked by your
        # OpenRouter privacy settings. Log it and try the next model.
        msg = _openrouter_error(response)
        log.warning("OpenRouter 404 for %s: %s", model, msg)
        not_found.append(f"{model}: {msg}")
        continue
 
      if response.status_code != 200:
        msg = _openrouter_error(response)
        log.error("OpenRouter %s for %s: %s", response.status_code, model, msg)
        # Pass through the meaningful client errors; anything else is a 502.
        status = response.status_code if response.status_code in (400, 401, 402, 403, 429) else 502
        raise HTTPException(
            status_code=status,
            detail=f"OpenRouter error {response.status_code} (model {model}): {msg}",
        )
 
      data = response.json()
 
      # OpenRouter can return HTTP 200 with an error object if the provider
      # failed after the request started.
      if isinstance(data, dict) and data.get("error"):
        raise HTTPException(
            status_code=502,
            detail=f"OpenRouter error (model {model}): {_openrouter_error(response)}",
        )
 
      try:
        raw_content = data["choices"][0]["message"]["content"]
      except (KeyError, IndexError, TypeError):
        raise HTTPException(
            status_code=502,
            detail=f"Unexpected OpenRouter response (model {model}): {str(data)[:500]}",
        )
      if isinstance(raw_content, list):  # some providers return content parts
        raw_content = "".join(
            p.get("text", "") for p in raw_content if isinstance(p, dict)
        )
      if not raw_content or not raw_content.strip():
        raise HTTPException(
            status_code=502, detail=f"Model {model} returned an empty reply."
        )
 
      try:
        result = _normalize(_extract_json(raw_content))
      except (json.JSONDecodeError, ValueError) as e:
        log.error("Bad JSON from %s: %s | raw: %s", model, e, raw_content[:500])
        raise HTTPException(
            status_code=502,
            detail=f"Model {model} did not return valid JSON: {e}. Raw reply: {raw_content[:300]}",
        )
 
      log.info("Classified with %s: %s", data.get("model", model), result)
      return result
 
  raise HTTPException(
      status_code=502,
      detail=(
          "Every configured OpenRouter model returned 404: "
          + " | ".join(not_found)
          + ". Pick a current free vision model at "
          "https://openrouter.ai/models?input_modalities=image&max_price=0 and set "
          "OPENROUTER_MODELS in .env. If the message mentions 'data policy', enable "
          "free-model access at https://openrouter.ai/settings/privacy."
      ),
  )
 
 
# ---------------------------------------------------------------------------
# Telegram driver dispatch
# ---------------------------------------------------------------------------
 
 
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
      road_node=road_node,
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
 
