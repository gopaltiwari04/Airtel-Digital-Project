import re
from typing import Dict, Any, List, Optional
from backend.services.bundle_engine import recommend_bundle

SYSTEM_PROMPT = """
You are Accel SYNC Advisor, an enterprise connectivity and digital solutions advisor for Indian MSMEs.
Your goal is to conduct conversational slot-filling in English, Hindi, or Hinglish to understand:
1. Business Vertical (e.g. Retail/Kirana, Clinic/CA Office, Restaurant Chain, Manufacturing)
2. Team Size / Headcount (approximate employee count)
3. Number of Locations / Branches (single site or multi-site)
4. Primary Pain Points / Priorities (e.g. internet drops, high phone bills, data security, customer WhatsApp channel, CCTV)
5. Monthly Budget (optional)
Capture all slots within 3 turns. Speak respectfully and concisely.
"""

def detect_language(text: str) -> str:
    hindi_keywords = ['namaste', 'hai', 'kripya', 'chahiye', 'mera', 'meri', 'dukaan', 'kitna', 'hoga', 'humara', 'aap']
    t_lower = text.lower()
    # Check Devanagari Unicode
    if any('\u0900' <= char <= '\u097f' for char in text):
        return 'hi'
    if any(k in t_lower for k in hindi_keywords):
        return 'hinglish'
    return 'en'

def extract_slots_from_text(text: str, current_slots: Dict[str, Any]) -> Dict[str, Any]:
    slots = dict(current_slots)
    t = text.lower()

    # Vertical
    if any(w in t for w in ['kirana', 'retail', 'dukaan', 'shop', 'store', 'salon', 'parlour', 'pharmacy', 'medical store']):
        slots['vertical'] = 'micro'
    elif any(w in t for w in ['clinic', 'hospital', 'doctor', 'ca', 'chartered', 'lawyer', 'legal', 'consultant', 'coaching', 'office']):
        slots['vertical'] = 'prof'
    elif any(w in t for w in ['chain', 'restaurant', 'branches', 'multi-site', 'multiple shops', 'outlets']):
        slots['vertical'] = 'multi'
    elif any(w in t for w in ['factory', 'manufacturing', 'textile', 'plant', 'workshop', 'industrial', 'auto parts']):
        slots['vertical'] = 'mfg'

    # Headcount (employees)
    # Match phrases like "5 employees", "10 log", "team of 8", "15 people", or just numbers
    m_hc = re.search(r'(\d+)\s*(people|employees|members|staff|team|log|persons)', t)
    if m_hc:
        slots['headcount'] = int(m_hc.group(1))
    else:
        # Check standalone numbers
        m_num = re.search(r'\b([1-9][0-9]?)\b', t)
        if m_num and 'headcount' not in slots and 'locations' not in slots:
            slots['headcount'] = int(m_num.group(1))

    # Locations
    m_loc = re.search(r'(\d+)\s*(branches|locations|sites|shops|stores|outlets|jagah)', t)
    if m_loc:
        slots['locations'] = int(m_loc.group(1))
    elif 'single' in t or 'ek hi' in t or 'one site' in t or 'one shop' in t:
        slots['locations'] = 1

    # Priorities
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

    # Budget
    m_bud = re.search(r'(?:rs\.?|inr|₹|\b)\s*(\d{3,6})', t)
    if m_bud and int(m_bud.group(1)) >= 1000:
        slots['budget'] = float(m_bud.group(1))

    return slots

def process_advisor_turn(
    message: str,
    history: List[Dict[str, str]],
    slots: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Slot filling conversation loop. Captures MSME profile in <=3 turns.
    Returns next response message and structured bundle quote when ready.
    """
    lang = detect_language(message)
    updated_slots = extract_slots_from_text(message, slots)
    turn_count = len([m for m in history if m.get('role') == 'user']) + 1

    has_vertical = 'vertical' in updated_slots
    has_headcount = 'headcount' in updated_slots
    has_locations = 'locations' in updated_slots

    is_complete = has_vertical and has_headcount and has_locations

    # Auto-fill defaults if at turn 3 to guarantee immediate recommendations
    if not is_complete and turn_count >= 3:
        if not has_vertical:
            updated_slots['vertical'] = 'micro'
        if not has_headcount:
            updated_slots['headcount'] = 5
        if not has_locations:
            updated_slots['locations'] = 1
        is_complete = True

    if is_complete:
        # Trigger deterministic bundle engine
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
        }.get(updated_slots['vertical'], 'Business')

        if lang == 'hi':
            reply = (
                f"बहुत बढ़िया! आपकी {vert_name} ({updated_slots.get('headcount', 5)} टीम सदस्य, "
                f"{updated_slots.get('locations', 1)} लोकेशन) के लिए हमने 3 अनुकूलित प्लान तैयार किए हैं। "
                f"हमारी सिफारिश है **{quote['recommended_tier']} Plan**, जिसमें हाई-स्पीड फाइबर, बिजनेस सिम, "
                f"और एक ही समेकित बिल (Single Bill) शामिल है। नीचे दिए गए प्लान्स में से अपना पसंदीदा विकल्प चुनें!"
            )
        elif lang == 'hinglish':
            reply = (
                f"Great! Aapke {vert_name} ke liye ({updated_slots.get('headcount', 5)} staff members, "
                f"{updated_slots.get('locations', 1)} location), humne 3 tailor-made packages design kiye hain. "
                f"Hamara top recommendation **{quote['recommended_tier']} Bundle** hai jisme reliable fiber internet, "
                f"business postpaid SIMs, aur complete single monthly bill milega. Check out the quote below!"
            )
        else:
            reply = (
                f"Thank you! Based on your {vert_name} setup ({updated_slots.get('headcount', 5)} team members, "
                f"{updated_slots.get('locations', 1)} branch{'es' if updated_slots.get('locations', 1) > 1 else ''}), "
                f"we have engineered three consolidated bundles. Our primary recommendation is the **{quote['recommended_tier']} Bundle**, "
                f"giving you high-speed dedicated connectivity, business postpaid lines, and cloud tools under a single guaranteed SLA and monthly bill."
            )

        return {
            'reply': reply,
            'slots': updated_slots,
            'is_complete': True,
            'quote_payload': quote
        }

    # Generate slot-filling follow-up questions
    if not has_vertical:
        if lang == 'hi':
            reply = "नमस्ते! कृपया अपने व्यवसाय का प्रकार बताएं (जैसे कि रिटेल स्टोर, क्लिनिक/ऑफिस, रेस्टोरेंट चेन या मैन्युफैक्चरिंग)?"
        elif lang == 'hinglish':
            reply = "Namaste! Aapka business kis category mein aata hai (jaise retail shop, clinic/office, multiple branches, ya factory)?"
        else:
            reply = "Welcome to Accel SYNC! What type of business do you run (e.g. Retail Store, Professional Office, Multi-site Retail, or Manufacturing)?"
    elif not has_headcount:
        if lang == 'hi':
            reply = "आपकी टीम में कुल कितने सदस्य या कर्मचारी काम करते हैं, और कितने सिम कार्ड की आवश्यकता होगी?"
        elif lang == 'hinglish':
            reply = "Aapki team mein lagbhag kitne log kaam karte hain jinko business SIM ya tools chahiye honge?"
        else:
            reply = "How many employees or team members work in your business who require connectivity or SIMs?"
    else:
        if lang == 'hi':
            reply = "क्या आपका यह एक ही ऑफिस/दुकान है या अन्य शहरों/लोकेशन पर भी शाखाएं हैं?"
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
