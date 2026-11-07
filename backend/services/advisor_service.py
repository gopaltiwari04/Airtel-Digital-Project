import os
import re
import json
import urllib.request
from typing import Dict, Any, List, Optional
from backend.services.bundle_engine import recommend_bundle

SYSTEM_PROMPT = """You are the official Conversational Advisor for Airtel Business SYNC (Bharti Airtel Enterprise & MSME Solutions).
You talk strictly, respectfully, and exclusively as Airtel Business SYNC. Never break character. Never mention you are Gemini, Google, an AI model, or an LLM.

Your objective:
1. Conduct consultative enterprise discovery for Indian MSMEs looking for unified connectivity and digital solutions:
   - Airtel Biz Fibre Broadband (100 Mbps, 300 Mbps, 1 Gbps) with dedicated throughput
   - Airtel Business Postpaid SIMs (unlimited corporate calling, shared pooling)
   - Enterprise Static IP, Cloud Telephony / SIP, Cloud Backup (1 TB), Endpoint Security, and WhatsApp Business API.
2. Converse naturally in the user's language (English, Hindi, or Hinglish). Keep responses warm, respectful, and concise.
3. Extract and track the key MSME slots:
   - vertical: "micro" (Retail/Kirana/Store/Salon/Pharmacy), "prof" (Clinic/Doctor/Law/CA Office/Consultant), "multi" (Restaurant chain/Multi-branch retail), or "mfg" (Manufacturing/Industrial Factory).
   - headcount: number of employees/staff members needing SIMs or connectivity.
   - locations: number of branches or physical locations (e.g. 1, 2, 3).
   - priorities: array of key requirements (e.g. "broadband", "business SIMs", "static IP", "cloud backup", "WhatsApp API", "cybersecurity").
   - budget: optional monthly budget in INR.
4. Answer any questions about Airtel enterprise services accurately:
   - 99.5% uptime SLA (99.9% for leased lines), 4-hour MTTR guarantee.
   - Single consolidated monthly tax invoice (SAC 998422) for all services, broadband, and SIMs.
   - ₹0 one-time setup fee on all 24-month or 36-month contracts.
   - Direct support through 24x7 Enterprise Helpdesk (1800-103-SYNC).
   - Number porting (MNP) to Airtel Business postpaid without downtime.
5. Return strictly a JSON object matching this schema:
{
  "reply": "Your natural, polite response as Airtel Business SYNC in the user's language.",
  "slots": {
    "vertical": "micro" | "prof" | "multi" | "mfg" | null,
    "headcount": number | null,
    "locations": number | null,
    "priorities": string[] | null,
    "budget": number | null
  },
  "is_complete": boolean
}"""

def get_gemini_api_key() -> Optional[str]:
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k.strip() == "GEMINI_API_KEY":
                        val = v.strip().strip('"').strip("'")
                        os.environ["GEMINI_API_KEY"] = val
                        return val
    return None

def normalize_vertical(v: Optional[str]) -> str:
    if not v:
        return "micro"
    s = v.lower()
    if any(k in s for k in ["retail", "shop", "store", "kirana", "sweet", "bakery", "salon", "pharmacy", "micro"]):
        return "micro"
    if any(k in s for k in ["clinic", "doctor", "health", "physio", "hospital", "ca", "law", "office", "consult", "coaching", "prof"]):
        return "prof"
    if any(k in s for k in ["restaurant", "chain", "multi", "food", "branch"]):
        return "multi"
    if any(k in s for k in ["factory", "mfg", "manufactur", "plant", "industrial", "parts"]):
        return "mfg"
    return "micro"

def call_gemini_advisor(message: str, history: List[Dict[str, str]], slots: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    api_key = get_gemini_api_key()
    if not api_key:
        return None

    contents = []
    for m in history:
        if m.get("content"):
            role = "model" if m.get("role") == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text")
            if raw_text:
                return json.loads(raw_text)
    except Exception as e:
        print(f"[Gemini Advisor Error]: {e}")
        return None
    return None

def detect_language(text: str) -> str:
    hindi_keywords = ['namaste', 'hai', 'kripya', 'chahiye', 'mera', 'meri', 'dukaan', 'kitna', 'hoga', 'humara', 'aap']
    t_lower = text.lower()
    if any('\u0900' <= char <= '\u097f' for char in text):
        return 'hi'
    if any(k in t_lower for k in hindi_keywords):
        return 'hinglish'
    return 'en'

def extract_slots_from_text(text: str, current_slots: Dict[str, Any]) -> Dict[str, Any]:
    slots = dict(current_slots)
    t = text.lower()

    if any(w in t for w in ['kirana', 'retail', 'dukaan', 'shop', 'store', 'salon', 'parlour', 'pharmacy', 'medical store']):
        slots['vertical'] = 'micro'
    elif any(w in t for w in ['clinic', 'hospital', 'doctor', 'ca', 'chartered', 'lawyer', 'legal', 'consultant', 'coaching', 'office']):
        slots['vertical'] = 'prof'
    elif any(w in t for w in ['chain', 'restaurant', 'branches', 'multi-site', 'multiple shops', 'outlets']):
        slots['vertical'] = 'multi'
    elif any(w in t for w in ['factory', 'manufacturing', 'textile', 'plant', 'workshop', 'industrial', 'auto parts']):
        slots['vertical'] = 'mfg'

    m_hc = re.search(r'(\d+)\s*(people|employees|members|staff|team|log|persons)', t)
    if m_hc:
        slots['headcount'] = int(m_hc.group(1))
    else:
        m_num = re.search(r'\b([1-9][0-9]?)\b', t)
        if m_num and 'headcount' not in slots and 'locations' not in slots:
            slots['headcount'] = int(m_num.group(1))

    m_loc = re.search(r'(\d+)\s*(branches|locations|sites|shops|stores|outlets|jagah)', t)
    if m_loc:
        slots['locations'] = int(m_loc.group(1))
    elif any(w in t for w in ['single', 'ek hi', 'one site', 'one shop', '1 site', '1 location', '1 shop']):
        slots['locations'] = 1

    priorities = slots.get('priorities', [])
    if any(w in t for w in ['slow internet', 'drops', 'reliable', 'speed', 'broadband', 'failover', 'wifi']):
        priorities.append('high-speed connectivity')
    if any(w in t for w in ['calling', 'sim', 'postpaid', 'phone bills', 'calling staff']):
        priorities.append('business SIMs')
    if any(w in t for w in ['whatsapp', 'sms', 'customer reach', 'marketing']):
        priorities.append('WhatsApp API')
    if any(w in t for w in ['cctv', 'camera', 'surveillance', 'theft']):
        priorities.append('Cloud CCTV')
    if any(w in t for w in ['cloud', 'backup', 'tally', 'storage', 'email']):
        priorities.append('Cloud Email & Backup')
    if any(w in t for w in ['security', 'antivirus', 'firewall', 'hack']):
        priorities.append('Cybersecurity')
    slots['priorities'] = list(set(priorities))

    m_bud = re.search(r'(?:rs\.?|inr|₹|\b)\s*(\d{3,6})', t)
    if m_bud and int(m_bud.group(1)) >= 1000:
        slots['budget'] = float(m_bud.group(1))

    return slots

def process_advisor_turn(
    message: str,
    history: List[Dict[str, str]],
    slots: Dict[str, Any]
) -> Dict[str, Any]:
    # 1. Try Gemini
    gemini_res = call_gemini_advisor(message, history, slots)
    if gemini_res and gemini_res.get("reply"):
        merged_slots = dict(slots)
        g_slots = gemini_res.get("slots") or {}
        if g_slots.get("vertical"):
            merged_slots["vertical"] = normalize_vertical(g_slots["vertical"])
        if g_slots.get("headcount"):
            try:
                merged_slots["headcount"] = int(g_slots["headcount"])
            except (ValueError, TypeError):
                pass
        if g_slots.get("locations"):
            try:
                merged_slots["locations"] = int(g_slots["locations"])
            except (ValueError, TypeError):
                pass
        if g_slots.get("priorities"):
            p = list(set(merged_slots.get("priorities", []) + list(g_slots["priorities"])))
            merged_slots["priorities"] = p
        if g_slots.get("budget"):
            try:
                merged_slots["budget"] = float(g_slots["budget"])
            except (ValueError, TypeError):
                pass

        is_complete = bool(
            gemini_res.get("is_complete") or
            (merged_slots.get("vertical") and merged_slots.get("headcount") and merged_slots.get("locations"))
        )

        quote = None
        if is_complete:
            quote = recommend_bundle(
                vertical=merged_slots.get("vertical", "micro"),
                headcount=merged_slots.get("headcount", 5),
                locations=merged_slots.get("locations", 1),
                priorities=merged_slots.get("priorities", []),
                budget=merged_slots.get("budget")
            )

        return {
            "reply": gemini_res["reply"],
            "slots": merged_slots,
            "is_complete": is_complete,
            "quote_payload": quote
        }

    # 2. Deterministic Fallback
    lang = detect_language(message)
    updated_slots = extract_slots_from_text(message, slots)
    turn_count = len([m for m in history if m.get('role') == 'user']) + 1

    has_vertical = 'vertical' in updated_slots
    has_headcount = 'headcount' in updated_slots
    has_locations = 'locations' in updated_slots
    is_complete = has_vertical and has_headcount and has_locations

    if not is_complete and turn_count >= 3:
        if not has_vertical:
            updated_slots['vertical'] = 'micro'
        if not has_headcount:
            updated_slots['headcount'] = 5
        if not has_locations:
            updated_slots['locations'] = 1
        is_complete = True

    if is_complete:
        quote = recommend_bundle(
            vertical=updated_slots.get('vertical', 'micro'),
            headcount=updated_slots.get('headcount', 5),
            locations=updated_slots.get('locations', 1),
            priorities=updated_slots.get('priorities', []),
            budget=updated_slots.get('budget')
        )

        vert_name = {
            'micro': 'Micro Retail & Services',
            'prof': 'Professional Office',
            'multi': 'Multi-site Enterprise',
            'mfg': 'Manufacturing Unit'
        }.get(updated_slots.get('vertical', 'micro'), 'Business')

        if lang == 'hi':
            reply = (
                f"बहुत बढ़िया! आपकी {vert_name} ({updated_slots.get('headcount', 5)} टीम सदस्य, "
                f"{updated_slots.get('locations', 1)} लोकेशन) के लिए Airtel Business SYNC के 3 प्लान तैयार हैं। "
                f"हमारी सिफारिश है **{quote['recommended_tier']} Plan**, जिसमें हाई-स्पीड फाइबर, बिजनेस सिम, "
                f"और एक ही समेकित बिल (Single Bill) शामिल है। नीचे दिए गए प्लान्स देखें!"
            )
        elif lang == 'hinglish':
            reply = (
                f"Great! Aapke {vert_name} ke liye ({updated_slots.get('headcount', 5)} staff members, "
                f"{updated_slots.get('locations', 1)} location), Airtel Business SYNC ne 3 tailor-made packages design kiye hain. "
                f"Hamara top recommendation **{quote['recommended_tier']} Bundle** hai. Check out the quote below!"
            )
        else:
            reply = (
                f"Thank you! Based on your {vert_name} setup ({updated_slots.get('headcount', 5)} team members, "
                f"{updated_slots.get('locations', 1)} branch{'es' if updated_slots.get('locations', 1) > 1 else ''}), "
                f"Airtel Business SYNC has engineered three consolidated bundles. Our primary recommendation is the **{quote['recommended_tier']} Bundle**, "
                f"delivering high-speed enterprise fiber, business SIMs, and single-bill convenience."
            )

        return {
            'reply': reply,
            'slots': updated_slots,
            'is_complete': True,
            'quote_payload': quote
        }

    if not has_vertical:
        if lang == 'hi':
            reply = "नमस्ते! Airtel Business SYNC में आपका स्वागत है। कृपया अपने व्यवसाय का प्रकार बताएं (जैसे रिटेल स्टोर, क्लिनिक/ऑफिस, रेस्टोरेंट चेन या मैन्युफैक्चरिंग)?"
        elif lang == 'hinglish':
            reply = "Namaste! Airtel Business SYNC mein aapka swagat hai. Aapka business kis category mein aata hai (jaise retail shop, clinic/office, multiple branches, ya factory)?"
        else:
            reply = "Welcome to Airtel Business SYNC! What type of business do you run (e.g. Retail Store, Professional Office, Multi-site Retail, or Manufacturing)?"
    elif not has_headcount:
        if lang == 'hi':
            reply = "आपकी टीम में कुल कितने सदस्य या कर्मचारी काम करते हैं, और कितने बिजनेस सिम कार्ड की आवश्यकता होगी?"
        elif lang == 'hinglish':
            reply = "Aapki team mein lagbhag kitne log kaam karte hain jinko Airtel business SIM ya broadband access chahiye?"
        else:
            reply = "How many employees or team members work in your business who require connectivity or business SIMs?"
    else:
        if lang == 'hi':
            reply = "क्या आपका यह एक ही ऑफिस/दुकान है या अन्य लोकेशन पर भी शाखाएं हैं?"
        elif lang == 'hinglish':
            reply = "Kya aapka single office/shop hai ya aur bhi multiple branches/locations hain?"
        else:
            reply = "Do you operate from a single location, or do you have multiple branches/sites across cities?"

    return {
        'reply': reply,
        'slots': updated_slots,
        'is_complete': False,
        'quote_payload': None
    }
