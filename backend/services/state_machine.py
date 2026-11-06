import sqlite3
import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'airtel_sync.db')

STAGES = [
    {
        'stage_id': 1,
        'name': 'KYC Verified',
        'key': 'KYC_VERIFIED',
        'title': 'Identity & DPDP Consent Verified',
        'description': 'GSTIN and Udyam credentials validated against official registries. DPDP consent locked.',
        'badge': 'Completed'
    },
    {
        'stage_id': 2,
        'name': 'Feasibility Confirmed',
        'key': 'FEASIBILITY_CONFIRMED',
        'title': 'Network Feasibility Confirmed',
        'description': 'Airtel Enterprise Fiber/AirFiber port allocated at your premises DP/splitter.',
        'badge': 'Completed'
    },
    {
        'stage_id': 3,
        'name': 'Hardware & SIM Dispatched',
        'key': 'DISPATCHED',
        'title': 'Enterprise Router & 4G/5G SIMs Dispatched',
        'description': 'Dispatched via Blue Dart Courier (AWB #BD-8829104). Expected delivery within 24 hours.',
        'badge': 'In Transit'
    },
    {
        'stage_id': 4,
        'name': 'Engineer Scheduled',
        'key': 'ENGINEER_SCHEDULED',
        'title': 'Installation Engineer Assigned',
        'description': 'Senior Field Engineer Ramesh Kumar (+91 98101 23456) scheduled for on-site cabling & testing.',
        'badge': 'Scheduled'
    },
    {
        'stage_id': 5,
        'name': 'Service Active',
        'key': 'SERVICE_ACTIVE',
        'title': 'Service Active & Single Bill Live',
        'description': 'End-to-end circuit validated. 99.5% SLA and single monthly billing active.',
        'badge': 'Upcoming'
    }
]

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_order(
    customer_name: str,
    business_name: str,
    bundle_name: str,
    contract_tenure_months: int,
    monthly_recurring_charge: float,
    one_time_setup_fee: float,
    gst_amount: float,
    total_monthly_bill: float,
    installation_address: str = "Shop 12, Commercial Complex, MG Road"
) -> Dict[str, Any]:
    order_id = f"SYNC-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now()
    scheduled_slot = (now + timedelta(days=2)).strftime('%Y-%m-%d 14:00 - 16:00')

    whatsapp_logs = [
        {
            'timestamp': now.strftime('%d %b %Y, %I:%M %p'),
            'sender': 'Airtel Business SYNC',
            'message': f"Hello {customer_name}! Your Accel SYNC order {order_id} is confirmed. DPDP KYC verified successfully. Single Monthly Bill: Rs. {total_monthly_bill:,.2f}."
        },
        {
            'timestamp': (now + timedelta(minutes=45)).strftime('%d %b %Y, %I:%M %p'),
            'sender': 'Airtel Business SYNC',
            'message': f"Feasibility confirmed at {installation_address}. Router & Business SIMs dispatched via BlueDart (AWB BD-8829104)."
        },
        {
            'timestamp': (now + timedelta(hours=2)).strftime('%d %b %Y, %I:%M %p'),
            'sender': 'Airtel Business SYNC',
            'message': f"Installation engineer Ramesh Kumar (+91 98101 23456) is scheduled for {scheduled_slot}. You can reschedule anytime in your portal."
        }
    ]

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO orders (
            order_id, customer_name, business_name, bundle_name, contract_tenure_months,
            monthly_recurring_charge, one_time_setup_fee, gst_amount, total_monthly_bill,
            provisioning_stage, installation_address, scheduled_engineer_slot, whatsapp_logs,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        order_id, customer_name, business_name, bundle_name, contract_tenure_months,
        monthly_recurring_charge, one_time_setup_fee, gst_amount, total_monthly_bill,
        'ENGINEER_SCHEDULED', installation_address, scheduled_slot, json.dumps(whatsapp_logs),
        now.isoformat(), now.isoformat()
    ))
    conn.commit()
    conn.close()

    return get_order_tracker(order_id)

def get_order_tracker(order_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders WHERE order_id = ?", (order_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        # Fallback demo order tracker
        now = datetime.now()
        slot = (now + timedelta(days=2)).strftime('%Y-%m-%d 14:00 - 16:00')
        whatsapp_logs = [
            {'timestamp': now.strftime('%d %b %Y, %I:%M %p'), 'sender': 'Airtel Business SYNC', 'message': f"Order {order_id} confirmed. DPDP KYC verified."},
            {'timestamp': (now + timedelta(minutes=30)).strftime('%d %b %Y, %I:%M %p'), 'sender': 'Airtel Business SYNC', 'message': "Hardware & SIMs dispatched via BlueDart AWB BD-8829104."},
            {'timestamp': (now + timedelta(hours=1)).strftime('%d %b %Y, %I:%M %p'), 'sender': 'Airtel Business SYNC', 'message': f"Engineer Ramesh Kumar assigned for {slot}."}
        ]
        curr_stage_idx = 4
        return {
            'order_id': order_id,
            'customer_name': 'Sunil Patel',
            'business_name': 'Patel Dental Care',
            'bundle_name': 'Growth Bundle (300 Mbps + 4 SIMs + WhatsApp API)',
            'current_stage': 'ENGINEER_SCHEDULED',
            'current_stage_index': curr_stage_idx,
            'stages': STAGES,
            'engineer': {
                'name': 'Ramesh Kumar',
                'phone': '+91 98101 23456',
                'eta': 'Tomorrow, 2:00 PM',
                'slot': slot,
                'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
            },
            'courier': {
                'partner': 'Blue Dart Express',
                'tracking_number': 'BD-8829104',
                'status': 'Out for Delivery'
            },
            'whatsapp_logs': whatsapp_logs,
            'total_monthly_bill': 3420.82
        }

    data = dict(row)
    logs = json.loads(data['whatsapp_logs']) if data.get('whatsapp_logs') else []
    
    stage_key = data.get('provisioning_stage', 'ENGINEER_SCHEDULED')
    stage_idx = 4
    for idx, s in enumerate(STAGES, 1):
        if s['key'] == stage_key:
            stage_idx = idx

    return {
        'order_id': data['order_id'],
        'customer_name': data['customer_name'],
        'business_name': data['business_name'],
        'bundle_name': data['bundle_name'],
        'contract_tenure_months': data['contract_tenure_months'],
        'total_monthly_bill': data['total_monthly_bill'],
        'current_stage': stage_key,
        'current_stage_index': stage_idx,
        'stages': STAGES,
        'installation_address': data['installation_address'],
        'engineer': {
            'name': 'Ramesh Kumar',
            'phone': '+91 98101 23456',
            'eta': 'Tomorrow, 2:00 PM',
            'slot': data.get('scheduled_engineer_slot', '2026-07-17 14:00 - 16:00')
        },
        'courier': {
            'partner': 'Blue Dart Express',
            'tracking_number': 'BD-8829104',
            'status': 'In Transit'
        },
        'whatsapp_logs': logs
    }

def reschedule_engineer_slot(order_id: str, new_slot: str) -> Dict[str, Any]:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders WHERE order_id = ?", (order_id,))
    row = cur.fetchone()
    
    now = datetime.now()
    log_msg = {
        'timestamp': now.strftime('%d %b %Y, %I:%M %p'),
        'sender': 'Airtel Business SYNC',
        'message': f"Your installation slot for order {order_id} has been rescheduled to {new_slot}. Engineer Ramesh Kumar notified."
    }

    if row:
        logs = json.loads(row['whatsapp_logs']) if row['whatsapp_logs'] else []
        logs.append(log_msg)
        cur.execute("""
            UPDATE orders
            SET scheduled_engineer_slot = ?, whatsapp_logs = ?, updated_at = ?
            WHERE order_id = ?
        """, (new_slot, json.dumps(logs), now.isoformat(), order_id))
        conn.commit()
    conn.close()

    return get_order_tracker(order_id)
