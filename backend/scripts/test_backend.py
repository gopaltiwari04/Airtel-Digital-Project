import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import json
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_all():
    print("=== Testing FastAPI Backend Endpoints ===")

    # 1. Health
    r = client.get("/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    print("[PASS] /health:", r.json())

    # 2. Advisor Chat (Turn 1: User says vertical & team)
    r = client.post("/api/advisor/chat", json={
        "message": "Namaste! Meri retail pharmacy dukaan hai, 6 log kaam karte hain.",
        "history": [],
        "slots": {}
    })
    assert r.status_code == 200, f"Advisor Turn 1 failed: {r.text}"
    data = r.json()
    print("[PASS] /api/advisor/chat (Turn 1):", data['slots'], "Complete:", data['is_complete'])

    # Advisor Chat (Turn 2: User provides branch count)
    r2 = client.post("/api/advisor/chat", json={
        "message": "Ek hi dukaan hai, single location.",
        "history": [{"role": "user", "content": "Namaste! Meri retail pharmacy dukaan hai, 6 log kaam karte hain."}],
        "slots": data['slots']
    })
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2['is_complete'] == True
    assert 'quote_payload' in data2
    print("[PASS] /api/advisor/chat (Turn 2 - Complete & Triggered):", data2['quote_payload']['recommended_tier'])

    # 3. Quote Calculate
    r_quote = client.post("/api/quote/calculate", json={
        "items": [
            {"product_id": "P01", "quantity": 1},
            {"product_id": "P07", "quantity": 4},
            {"product_id": "P15", "quantity": 1}
        ],
        "tenure_months": 24
    })
    assert r_quote.status_code == 200
    q_data = r_quote.json()
    assert q_data['pricing']['setup_fee_waived'] == True
    assert q_data['pricing']['total_gst_18_pct'] > 0
    print("[PASS] /api/quote/calculate (24-mo setup waived, 18% GST): Monthly Rs.", q_data['pricing']['subsequent_monthly_bill'])

    # 4. DPDP Consent
    r_consent = client.post("/api/kyc/consent", json={
        "customer_identifier": "9812345678",
        "user_language": "hinglish"
    })
    assert r_consent.status_code == 200
    c_data = r_consent.json()
    assert c_data['status'] == 'GRANTED'
    assert 'DPDP-SYNC' in c_data['consent_id']
    print("[PASS] /api/kyc/consent:", c_data['consent_id'], "Policy:", c_data['retention_policy'][:40] + "...")

    # 5. Registry Lookup
    r_lookup = client.get("/api/kyc/lookup?gstin=37IHKXV5167L1ZS")
    assert r_lookup.status_code == 200
    l_data = r_lookup.json()
    assert l_data['gstin_found'] == True
    assert l_data['gstin_record']['status'] == 'Cancelled'
    print("[PASS] /api/kyc/lookup:", l_data['gstin_record']['legal_name'], "Status:", l_data['gstin_record']['status'])

    # 6. KYC Verify Specimens
    for specimen, expected_verdict in [('K01', 'RED'), ('K02', 'GREEN'), ('K03', 'GREEN'), ('K04', 'RED'), ('K07', 'AMBER'), ('K11', 'AMBER')]:
        r_ver = client.post("/api/kyc/verify", json={"applicant_id": specimen})
        assert r_ver.status_code == 200
        v_data = r_ver.json()
        assert v_data['scorecard']['verdict'] == expected_verdict, f"Mismatch for {specimen}: expected {expected_verdict}, got {v_data['scorecard']['verdict']}"
        print(f"[PASS] /api/kyc/verify ({specimen}): Verdict = {v_data['scorecard']['verdict']}, Flags = {v_data['scorecard']['flags']}")

    # 7. Orders & Tracker
    r_order = client.post("/api/orders/create", json={
        "customer_name": "Karthik Fernandes",
        "business_name": "Krishna Pharma Retail",
        "bundle_name": "Growth Bundle",
        "contract_tenure_months": 24,
        "monthly_recurring_charge": 3196.0,
        "one_time_setup_fee": 0.0,
        "gst_amount": 575.28,
        "total_monthly_bill": 3771.28
    })
    assert r_order.status_code == 200
    ord_data = r_order.json()
    order_id = ord_data['order_id']
    print("[PASS] /api/orders/create:", order_id, "Stage:", ord_data['current_stage'])

    # Reschedule order
    r_resched = client.post(f"/api/orders/{order_id}/reschedule", json={"new_slot": "2026-07-20 10:00 - 12:00"})
    assert r_resched.status_code == 200
    res_data = r_resched.json()
    assert res_data['engineer']['slot'] == "2026-07-20 10:00 - 12:00"
    print("[PASS] /api/orders/reschedule:", res_data['engineer']['slot'])

    # 8. Backoffice Leads & Call Script
    r_leads = client.get("/api/backoffice/leads?limit=10")
    assert r_leads.status_code == 200
    leads = r_leads.json()
    assert len(leads) > 0
    top_lead = leads[0]
    print(f"[PASS] /api/backoffice/leads: Loaded {len(leads)} leads. Top: {top_lead['business_name']} (Score: {top_lead['total_score']}, Queue: {top_lead['assigned_queue']})")

    r_script = client.get(f"/api/backoffice/leads/LEAD-K07/details")
    assert r_script.status_code == 200
    s_data = r_script.json()
    assert 'call_script' in s_data
    print("[PASS] /api/backoffice/leads/{id}/details (AI Call Script):", s_data['call_script']['persona'])

    print("\nALL BACKEND TESTS PASSED WITH ZERO ERRORS!")

if __name__ == '__main__':
    test_all()
