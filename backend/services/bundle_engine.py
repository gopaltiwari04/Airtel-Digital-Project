import sqlite3
import os
from typing import Dict, List, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'airtel_sync.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def recommend_bundle(
    vertical: str = "micro",
    headcount: int = 5,
    locations: int = 1,
    priorities: Optional[List[str]] = None,
    budget: Optional[float] = None
) -> Dict[str, Any]:
    """
    Deterministic bundle recommendation querying the 25 catalogue items.
    Generates three structured tiers: Starter, Growth, and Pro.
    All math is executed deterministically in Python to prevent LLM hallucinations.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products")
    products_by_id = {r['product_id']: dict(r) for r in cur.fetchall()}
    conn.close()

    vert = (vertical or "micro").lower()
    if any(k in vert for k in ['retail', 'salon', 'shop', 'kirana', 'store', 'micro']):
        vert_key = 'micro'
    elif any(k in vert for k in ['office', 'clinic', 'doctor', 'ca', 'legal', 'lawyer', 'consult', 'coaching', 'prof']):
        vert_key = 'prof'
    elif any(k in vert for k in ['chain', 'multi', 'restaurant', 'branch', 'store']):
        vert_key = 'multi'
    elif any(k in vert for k in ['factory', 'mfg', 'manufactur', 'industrial', 'plant']):
        vert_key = 'mfg'
    else:
        vert_key = 'micro'

    sim_count = max(2, min(headcount, 20))
    priors = [p.lower() for p in (priorities or [])]

    # Deterministic product selections per tier based on vertical & inputs
    if vert_key == 'micro':
        # Micro Retail & Services
        starter_pids = [('P01', 1), ('P07', min(2, sim_count)), ('P18', 1)]
        growth_pids = [('P01', 1), ('P07', min(4, sim_count)), ('P15', 1), ('P19', 1)]
        pro_pids = [('P02', 1), ('P07', min(8, sim_count)), ('P15', 1), ('P19', 1), ('P23', 2)]

    elif vert_key == 'prof':
        # Professional Offices
        starter_pids = [('P01', 1), ('P07', min(3, sim_count)), ('P16', min(5, headcount))]
        growth_pids = [('P02', 1), ('P07', min(6, sim_count)), ('P11', 1), ('P16', min(10, headcount)), ('P17', 1)]
        pro_pids = [('P03', 1), ('P08', min(10, sim_count)), ('P11', 1), ('P12', 1), ('P16', min(20, headcount)), ('P17', 1), ('P20', min(10, headcount))]

    elif vert_key == 'multi':
        # Small Multi-site Businesses
        sites = max(2, locations)
        starter_pids = [('P01', sites), ('P07', min(6, sim_count)), ('P22', sites)]
        growth_pids = [('P02', sites), ('P07', min(12, sim_count)), ('P09', sites), ('P13', 1), ('P23', sites * 2)]
        pro_pids = [('P03', sites), ('P08', min(20, sim_count)), ('P10', sites), ('P12', 1), ('P13', 1), ('P21', sites), ('P23', sites * 3)]

    else:
        # Small Manufacturers
        starter_pids = [('P02', 1), ('P07', min(5, sim_count)), ('P11', 1), ('P20', 5)]
        growth_pids = [('P05', 1), ('P08', min(10, sim_count)), ('P11', 1), ('P21', 1), ('P24', 2)]
        pro_pids = [('P06', 1), ('P08', min(20, sim_count)), ('P10', 1), ('P11', 1), ('P21', 1), ('P24', 5), ('P25', 3)]

    def compute_tier(tier_name: str, tier_pids: List[tuple], default_tenure: int = 12) -> Dict[str, Any]:
        items = []
        raw_mrc = 0.0
        raw_setup = 0.0
        install_days = 0

        for pid, qty in tier_pids:
            p = products_by_id.get(pid)
            if not p:
                continue
            unit_mrc = float(p['price_min_inr_per_month'])
            unit_setup = float(p['one_time_setup_fee'])
            tot_item_mrc = unit_mrc * qty
            tot_item_setup = unit_setup * qty
            raw_mrc += tot_item_mrc
            raw_setup += tot_item_setup
            install_days = max(install_days, int(p['typical_install_days']))

            items.append({
                'product_id': pid,
                'product_name': p['product_name'],
                'category': p['category'],
                'unit': p['unit'],
                'quantity': qty,
                'unit_mrc': unit_mrc,
                'total_mrc': round(tot_item_mrc, 2),
                'setup_fee': round(tot_item_setup, 2),
                'requires_gstin': p['requires_gstin'] == 'Y'
            })

        # Multi-product discount: 5% for >=3 products, 10% for >=5 products
        product_count = len(items)
        discount_pct = 0.0
        if product_count >= 5:
            discount_pct = 10.0
        elif product_count >= 3:
            discount_pct = 5.0

        discount_amount = round(raw_mrc * (discount_pct / 100.0), 2)
        net_mrc = round(raw_mrc - discount_amount, 2)
        
        # Setup fee waived for 24mo or 36mo contracts
        setup_waived = default_tenure >= 24
        final_setup = 0.0 if setup_waived else raw_setup

        gst_18 = round(net_mrc * 0.18, 2)
        total_monthly = round(net_mrc + gst_18, 2)

        sla = {
            'uptime': '99.9%' if ('P05' in [x[0] for x in tier_pids] or 'P06' in [x[0] for x in tier_pids]) else '99.5%',
            'mttr_hours': 4,
            'billing_cycle': '1st of every calendar month',
            'support_channel': 'Dedicated Priority Enterprise Helpdesk (1800-103-SYNC)',
            'single_bill': True
        }

        return {
            'tier_name': tier_name,
            'tagline': 'Best for getting started' if tier_name == 'Starter' else ('Most popular choice for growing businesses' if tier_name == 'Growth' else 'Full-stack enterprise grade solution'),
            'tenure_months': default_tenure,
            'items': items,
            'summary': {
                'subtotal_mrc': round(raw_mrc, 2),
                'bundle_discount_pct': discount_pct,
                'bundle_discount_amount': discount_amount,
                'net_mrc': net_mrc,
                'one_time_setup_fee': round(final_setup, 2),
                'original_setup_fee': round(raw_setup, 2),
                'setup_fee_waived': setup_waived,
                'gst_18_pct': gst_18,
                'total_monthly_bill': total_monthly,
                'install_lead_days': install_days
            },
            'sla': sla
        }

    starter = compute_tier("Starter", starter_pids, default_tenure=12)
    growth = compute_tier("Growth", growth_pids, default_tenure=24)
    pro = compute_tier("Pro", pro_pids, default_tenure=24)

    return {
        'vertical': vert_key,
        'headcount': headcount,
        'locations': locations,
        'tiers': {
            'starter': starter,
            'growth': growth,
            'pro': pro
        },
        'recommended_tier': 'Growth'
    }

def recalculate_quote(
    items: List[Dict[str, Any]],
    tenure_months: int = 12,
    billing_cycle_date: str = "1st of every month"
) -> Dict[str, Any]:
    """
    Dynamically recalculate pricing when add-ons are toggled or tenure changed.
    Generates unified single-bill preview with itemized GST and setup waivers.
    """
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products")
    products_by_id = {r['product_id']: dict(r) for r in cur.fetchall()}
    conn.close()

    enriched_items = []
    subtotal_mrc = 0.0
    original_setup = 0.0
    max_install_days = 3
    has_leased_line = False

    for item in items:
        pid = item['product_id']
        qty = int(item.get('quantity', 1))
        if qty <= 0:
            continue
        p = products_by_id.get(pid)
        if not p:
            continue

        unit_mrc = float(p['price_min_inr_per_month'])
        unit_setup = float(p['one_time_setup_fee'])
        line_mrc = unit_mrc * qty
        line_setup = unit_setup * qty

        subtotal_mrc += line_mrc
        original_setup += line_setup
        max_install_days = max(max_install_days, int(p['typical_install_days']))
        if pid in ['P05', 'P06']:
            has_leased_line = True

        enriched_items.append({
            'product_id': pid,
            'product_name': p['product_name'],
            'category': p['category'],
            'unit': p['unit'],
            'quantity': qty,
            'unit_mrc': unit_mrc,
            'total_mrc': round(line_mrc, 2),
            'unit_setup': unit_setup,
            'total_setup': round(line_setup, 2),
            'requires_gstin': p['requires_gstin'] == 'Y',
            'min_contract_months': int(p['min_tenure_months'])
        })

    # Discounts
    item_count = len(enriched_items)
    discount_pct = 0.0
    if item_count >= 5:
        discount_pct += 10.0
    elif item_count >= 3:
        discount_pct += 5.0

    if tenure_months >= 36:
        discount_pct += 5.0

    discount_amount = round(subtotal_mrc * (discount_pct / 100.0), 2)
    net_mrc = round(subtotal_mrc - discount_amount, 2)

    # Setup waiver rule: Waived for >= 24 months
    setup_waived = tenure_months >= 24
    effective_setup = 0.0 if setup_waived else round(original_setup, 2)

    # GST 18% (9% CGST + 9% SGST)
    cgst = round(net_mrc * 0.09, 2)
    sgst = round(net_mrc * 0.09, 2)
    total_gst = round(cgst + sgst, 2)
    total_monthly = round(net_mrc + total_gst, 2)

    return {
        'items': enriched_items,
        'contract_tenure_months': tenure_months,
        'billing_cycle_date': billing_cycle_date,
        'pricing': {
            'subtotal_mrc': round(subtotal_mrc, 2),
            'bundle_discount_pct': discount_pct,
            'bundle_discount_amount': discount_amount,
            'net_mrc': net_mrc,
            'original_setup_fee': round(original_setup, 2),
            'effective_setup_fee': effective_setup,
            'setup_fee_waived': setup_waived,
            'cgst_9_pct': cgst,
            'sgst_9_pct': sgst,
            'total_gst_18_pct': total_gst,
            'total_first_month_invoice': round(total_monthly + effective_setup, 2),
            'subsequent_monthly_bill': total_monthly
        },
        'sla': {
            'uptime_guarantee': '99.9%' if has_leased_line else '99.5%',
            'mttr_hours': 4,
            'consolidated_bill': True,
            'support': 'Single Enterprise Care Center 1800-103-SYNC',
            'install_lead_days': max_install_days
        }
    }
