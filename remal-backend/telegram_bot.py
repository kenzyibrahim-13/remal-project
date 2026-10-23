import httpx
from typing import Dict, Any

# Replace with your token from @BotFather
TELEGRAM_BOT_TOKEN = "8572100521:AAFm5QspuZlo-GFEUtt-o0qlhrlhH_L9_gA"
BASE_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# In-memory storage for active demo trips
ACTIVE_TRIPS: Dict[str, Dict[str, Any]] = {}

async def send_dispatch_leg_1(chat_id: int, match_result: Dict[str, Any], plant_node: Dict[str, Any], road_node: Dict[str, Any]):
    plant_name = plant_node.get("name", "الكسارة المعتمدة")
    lat, lng = plant_node["lat"], plant_node["lng"]
    tons = match_result.get("tons_diverted", 40)
    gate_fee = match_result.get("cost_egp", {}).get("gate_fee", 0)
    trip_id = f"REM-{match_result.get('plant_id')}-{match_result.get('site_id', 'D1')}".upper()

    # Cache trip details for when driver taps the arrival button
    ACTIVE_TRIPS[trip_id] = {
        "match": match_result,
        "plant": plant_node,
        "road": road_node,
        "chat_id": chat_id
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Send native Telegram pin for Crusher Plant
        await client.post(
            f"{BASE_URL}/sendVenue",
            json={
                "chat_id": chat_id,
                "latitude": lat,
                "longitude": lng,
                "title": f"محطة التدوير: {plant_name}",
                "address": "نقطة تفريغ الدبش والخرسانة"
            }
        )

        # 2. Send dispatch manifest with interactive action button
        maps_url = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}"
        text = (
            f"📋 *تصريح نقل ركام وهدم (المرحلة 1/2)*\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"🔹 *كود الرحلة:* `{trip_id}`\n"
            f"🏭 *الوجهة:* {plant_name}\n"
            f"⚖️ *الحمولة المقررة:* {tons} طن\n"
            f"💵 *رسوم البوابة (Gate Fee):* {gate_fee:,} ج.م\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ *تعليمات:* فرغ الركام، واطلب إيصال الوزن، ثم اضغط الزر بالأسفل لاستلام موقع الطريق."
        )
        keyboard = {
            "inline_keyboard": [
                [{"text": "🗺️ فتح الموقع في Google Maps", "url": maps_url}],
                [{"text": "✅ وصلت وفرغت الركام بالكسارة", "callback_data": f"arrived_plant:{trip_id}"}]
            ]
        }
        await client.post(
            f"{BASE_URL}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown", "reply_markup": keyboard}
        )


async def send_dispatch_leg_2(chat_id: int, trip_id: str):
    trip = ACTIVE_TRIPS.get(trip_id)
    if not trip or not trip.get("road"):
        return

    road_node = trip["road"]
    road_name = road_node.get("name", "موقع رصف الطريق")
    lat, lng = road_node["lat"], road_node["lng"]
    tons = trip["match"].get("tons_diverted", 40)
    maps_url = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Send native pin for Road Construction Project
        await client.post(
            f"{BASE_URL}/sendVenue",
            json={
                "chat_id": chat_id,
                "latitude": lat,
                "longitude": lng,
                "title": f"موقع التسليم: {road_name}",
                "address": "توريد سن معاد تدويره (طبقة أساس)"
            }
        )

        # 2. Send backhaul manifest
        text = (
            f"🚚 *أمر توريد سن رصف (المرحلة 2/2 - Backhaul)*\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"🛣️ *موقع الطريق:* {road_name}\n"
            f"📦 *المادة:* سن معاد تدويره (Recycled Sub-base)\n"
            f"⚖️ *الكمية:* {tons} طن\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"توجه إلى موقع الطريق لتسليم الحمولة."
        )
        keyboard = {
            "inline_keyboard": [
                [{"text": "🗺️ فتح مسار الطريق (Google Maps)", "url": maps_url}],
                [{"text": "🏁 تم تسليم السن بموقع الطريق", "callback_data": f"finished_road:{trip_id}"}]
            ]
        }
        await client.post(
            f"{BASE_URL}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown", "reply_markup": keyboard}
        )


async def send_completion(chat_id: int, trip_id: str):
    trip = ACTIVE_TRIPS.get(trip_id, {})
    match = trip.get("match", {})
    haul_cost = match.get("cost_egp", {}).get("haul", 5817)

    text = (
        f"🎉 *تم إنهاء المسار الترددي بنجاح!*\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"💵 *الأجرة المستحقة للمسار المثلث:* {haul_cost:,} ج.م\n"
        f"🌱 تم تسجيل النقلة وتفادي الإلقاء العشوائي بنجاح.\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"شكراً لتعاونك مع منصة رِمال (Remal Engine)."
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            f"{BASE_URL}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
        )