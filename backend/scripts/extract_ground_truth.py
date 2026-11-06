import os
import re
import json
import sqlite3
import asyncio
from datetime import datetime
from rapidfuzz import fuzz

try:
    from winsdk.windows.media.ocr import OcrEngine
    from winsdk.windows.globalization import Language
    from winsdk.windows.graphics.imaging import BitmapDecoder
    from winsdk.windows.storage import StorageFile
    HAS_WINSDK = True
except ImportError:
    HAS_WINSDK = False

TODAY_ANCHOR = datetime.strptime("2026-07-15", "%Y-%m-%d")

async def ocr_image_lines(image_path: str):
    if not os.path.exists(image_path):
        return None
    file = await StorageFile.get_file_from_path_async(os.path.abspath(image_path))
    stream = await file.open_async(0)
    decoder = await BitmapDecoder.create_async(stream)
    bitmap = await decoder.get_software_bitmap_async()
    engine = OcrEngine.try_create_from_language(Language('en-US'))
    res = await engine.recognize_async(bitmap)
    return [l.text.strip() for l in res.lines if l.text.strip()]

def parse_gst_lines(lines):
    if not lines or len(lines) < 5:
        return {'is_valid': False, 'error': 'Illegible or missing GST certificate', 'doc_type': 'gst_certificate'}
    
    # Check if blurred
    if len(lines) <= 2 and 'GST Registration Certificate' in lines[0]:
        return {'is_valid': False, 'error': 'Document unreadable / severely blurred', 'doc_type': 'gst_certificate'}

    cleaned = [l for l in lines if not l.startswith('Specimen:') and not l.startswith('Format for') and not 'Accel YTL' in l and l != '00']
    
    val_start = -1
    for i, l in enumerate(cleaned):
        clean_l = l.replace(' ', '').replace('O', '0').replace('I', '1')
        if re.search(r'\b[0-9]{2}[A-Z0-9]{10}[0-9][A-Z0-9]{2}\b', clean_l) or (len(clean_l) >= 14 and clean_l[:2].isdigit()):
            val_start = i
            break
            
    res = {'is_valid': True, 'doc_type': 'gst_certificate'}
    if val_start != -1:
        res['identifier'] = cleaned[val_start].replace(' ', '').replace('O', '0')
        if len(cleaned) > val_start + 1:
            res['legal_name'] = cleaned[val_start + 1]
        if len(cleaned) > val_start + 2:
            res['trade_name'] = cleaned[val_start + 2]
        if len(cleaned) > val_start + 3:
            res['constitution'] = cleaned[val_start + 3]
        
        addr_lines = []
        curr = val_start + 4
        while curr < len(cleaned) and not re.search(r'\d{4}-\d{2}', cleaned[curr]) and cleaned[curr] not in ['Regular', 'Composition']:
            addr_lines.append(cleaned[curr])
            curr += 1
        res['address'] = " ".join(addr_lines)
        m_pin = re.search(r'\b(\d{6})\b', res['address'])
        if m_pin:
            res['pincode'] = m_pin.group(1)
        
        while curr < len(cleaned):
            m_d = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', cleaned[curr])
            if m_d:
                res['issue_date'] = m_d.group(1)
            curr += 1
    return res

def parse_udyam_lines(lines):
    if not lines or len(lines) < 4:
        return {'is_valid': False, 'error': 'Missing or unreadable Udyam certificate', 'doc_type': 'udyam_certificate'}
    
    cleaned = [l for l in lines if not l.startswith('Specimen:') and not l.startswith('Format for') and not 'Accel YTL' in l and l != '00']
    
    res = {'is_valid': True, 'doc_type': 'udyam_certificate'}
    u_idx = -1
    for i, l in enumerate(cleaned):
        if 'UDYAM' in l.upper():
            u_idx = i
            res['identifier'] = l.replace(' ', '').replace('OO', '00').replace('O0', '00')
            break
    
    if u_idx != -1:
        if len(cleaned) > u_idx + 1:
            res['trade_name'] = cleaned[u_idx + 1]
            res['legal_name'] = cleaned[u_idx + 1]
        if len(cleaned) > u_idx + 2:
            res['major_activity'] = cleaned[u_idx + 2]
        if len(cleaned) > u_idx + 3:
            res['city'] = cleaned[u_idx + 3]
        if len(cleaned) > u_idx + 4:
            res['state'] = cleaned[u_idx + 4]
        for l in cleaned[u_idx:]:
            m_d = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', l)
            if m_d:
                res['issue_date'] = m_d.group(1)
    else:
        res['identifier'] = None
        for l in cleaned:
            if l not in ['Udyam reg. number', 'Enterprise name', 'Major activity', '5cIty', 'City', 'State', 'Date of registration']:
                if 'trade_name' not in res:
                    res['trade_name'] = l
                    res['legal_name'] = l
                m_d = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', l)
                if m_d:
                    res['issue_date'] = m_d.group(1)
    return res

def parse_address_lines(lines):
    if not lines or len(lines) < 5:
        return {'is_valid': False, 'error': 'Missing or unreadable address proof', 'doc_type': 'address_proof'}
    
    cleaned = [l for l in lines if not l.startswith('Specimen:') and not l.startswith('Fictional utility') and not 'Accel YTL' in l and l != '00']
    
    c_idx = -1
    for i, l in enumerate(cleaned):
        clean_num = l.replace(' ', '')
        if clean_num.isdigit() and len(clean_num) >= 9:
            c_idx = i
            break
            
    res = {'is_valid': True, 'doc_type': 'address_proof'}
    if c_idx != -1:
        res['identifier'] = cleaned[c_idx].replace(' ', '')
        if len(cleaned) > c_idx + 1:
            res['trade_name'] = cleaned[c_idx + 1]
            res['legal_name'] = cleaned[c_idx + 1]
        
        addr_lines = []
        curr = c_idx + 2
        while curr < len(cleaned) and not re.search(r'\d{4}-\d{2}-\d{2}', cleaned[curr]):
            addr_lines.append(cleaned[curr])
            curr += 1
        res['address'] = " ".join(addr_lines)
        m_pin = re.search(r'\b(\d{6})\b', res['address'])
        if m_pin:
            res['pincode'] = m_pin.group(1)
        
        if curr < len(cleaned):
            m_d = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', cleaned[curr])
            if m_d:
                res['issue_date'] = m_d.group(1)
    return res

def parse_signatory_lines(lines):
    if not lines or len(lines) < 4:
        return {'is_valid': False, 'error': 'Missing or unreadable signatory ID', 'doc_type': 'signatory_id'}
    
    res = {'is_valid': True, 'doc_type': 'signatory_id'}
    for i, l in enumerate(lines):
        if l == 'Name' and i + 1 < len(lines):
            res['signatory_name'] = lines[i + 1]
        elif l == 'Designation' and i + 1 < len(lines):
            res['signatory_designation'] = lines[i + 1]
        elif l == 'For business' and i + 1 < len(lines):
            res['trade_name'] = lines[i + 1]
        elif l == 'ID no.' and i + 1 < len(lines):
            res['identifier'] = lines[i + 1]
        elif l == 'Valid till' and i + 1 < len(lines):
            m_d = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', lines[i + 1])
            if m_d:
                res['issue_date'] = m_d.group(1)
    return res

async def build_ground_truth():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, '..', '6ae1873397bc1_digital', 'YTL_TrackA_Udyam_Digital_Data')
    kyc_folder = os.path.join(data_dir, 'kyc_documents')
    db_path = os.path.join(base_dir, 'data', 'airtel_sync.db')

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    ground_truth = {}

    known_seeds = {
        'K01': {'gstin': '37IHKXV5167L1ZS', 'udyam': None, 'entity_type': 'Proprietorship', 'desc': 'Cancelled GSTIN & missing Udyam registration number'},
        'K02': {'gstin': '19EOGXH4115Y1ZL', 'udyam': 'UDYAM-WB-00-5053330', 'entity_type': 'Micro Enterprise', 'desc': 'Udyam-only onboarding; non-GSTIN workflow route'},
        'K03': {'gstin': '27XUIXG0767D1ZP', 'udyam': 'UDYAM-MH-00-9516696', 'entity_type': 'Proprietorship', 'desc': 'Clean benchmark; all documents align perfectly'},
        'K04': {'gstin': '27PZSXS1936O1ZH', 'udyam': 'UDYAM-MH-00-6131836', 'entity_type': 'LLP', 'desc': 'Illegible blurred GST certificate defect'},
        'K05': {'gstin': '32TZAXB5481U1Z1', 'udyam': None, 'entity_type': 'LLP', 'desc': 'Missing Udyam certificate file; non-Udyam GSTIN path permitted'},
        'K06': {'gstin': '08YKZXS5189L1ZO', 'udyam': 'UDYAM-RJ-00-6577157', 'entity_type': 'Proprietorship', 'desc': 'Clean micro salon match; auto-approved'},
        'K07': {'gstin': '07CPCXN0398P1ZT', 'udyam': 'UDYAM-DL-00-9565547', 'entity_type': 'Proprietorship', 'desc': 'Minor fuzzy trade name mismatch (Shri vs Neelgiri Physio Clinic)'},
        'K08': {'gstin': '24XORXG9365M1Z3', 'udyam': 'UDYAM-GJ-00-8477445', 'entity_type': 'Proprietorship', 'desc': 'Professional legal consultancy, clean alignment'},
        'K09': {'gstin': '37LDYXK0296F1ZB', 'udyam': 'UDYAM-AP-00-9751562', 'entity_type': 'Proprietorship', 'desc': 'Insurance advisory firm, clean alignment'},
        'K10': {'gstin': '27QHJXK0658U1ZL', 'udyam': 'UDYAM-MH-00-7183141', 'entity_type': 'LLP', 'desc': 'Hospitality multi-site LLP, clean alignment'},
        'K11': {'gstin': '03KGZXT1320R1ZZ', 'udyam': 'UDYAM-PB-00-9719478', 'entity_type': 'Private Limited', 'desc': 'Expired address proof utility bill (>90 days old)'},
        'K12': {'gstin': '37NBLXS1145E1ZU', 'udyam': 'UDYAM-AP-00-5186772', 'entity_type': 'Proprietorship', 'desc': 'Electronics retail, clean alignment'}
    }

    for k in range(1, 13):
        code = f'K{k:02d}'
        print(f"Building verification ground truth for {code}...")
        
        seed = known_seeds[code]
        applicant = {
            'applicant_id': code,
            'description': seed['desc'],
            'workflow_path': 'UDYAM_ONLY' if code == 'K02' else ('GSTIN_ONLY' if code == 'K05' else 'STANDARD_DUAL'),
            'documents': {},
            'registry': {'gstin': None, 'udyam': None},
            'checks': {},
            'scorecard': {'verdict': 'PENDING', 'flags': [], 'field_diffs': []}
        }

        # 1. OCR Extraction
        for doc in ['gst_certificate', 'udyam_certificate', 'address_proof', 'signatory_id']:
            fname = f'{code}_{doc}.png'
            fpath = os.path.join(kyc_folder, fname)
            exists = os.path.exists(fpath)
            lines = await ocr_image_lines(fpath) if exists else None
            
            if doc == 'gst_certificate':
                doc_obj = parse_gst_lines(lines)
            elif doc == 'udyam_certificate':
                doc_obj = parse_udyam_lines(lines)
            elif doc == 'address_proof':
                doc_obj = parse_address_lines(lines)
            elif doc == 'signatory_id':
                doc_obj = parse_signatory_lines(lines)
                
            doc_obj['filename'] = fname
            doc_obj['file_exists'] = exists
            applicant['documents'][doc] = doc_obj

        # 2. Registry Lookups
        gst_id = seed['gstin']
        if gst_id:
            cur.execute("SELECT * FROM gstin_registry WHERE gstin = ?", (gst_id,))
            r = cur.fetchone()
            if r:
                applicant['registry']['gstin'] = dict(r)

        udyam_id = seed['udyam']
        if udyam_id:
            cur.execute("SELECT * FROM udyam_registry WHERE udyam_number = ?", (udyam_id,))
            r = cur.fetchone()
            if r:
                applicant['registry']['udyam'] = dict(r)

        # 3. Four Automated Checks
        # Check 1: Completeness
        missing_docs = []
        if code == 'K02':
            # Udyam-only micro onboarding: exempt from GSTIN
            for req in ['udyam_certificate', 'address_proof', 'signatory_id']:
                if not applicant['documents'][req]['file_exists'] or not applicant['documents'][req]['is_valid']:
                    missing_docs.append(req)
        elif code == 'K05':
            # Exempt from Udyam certificate
            for req in ['gst_certificate', 'address_proof', 'signatory_id']:
                if not applicant['documents'][req]['file_exists'] or not applicant['documents'][req]['is_valid']:
                    missing_docs.append(req)
        else:
            for req in ['gst_certificate', 'address_proof', 'signatory_id']:
                if not applicant['documents'][req]['file_exists'] or not applicant['documents'][req]['is_valid']:
                    missing_docs.append(req)
            if code == 'K04':
                missing_docs.append('gst_certificate_illegible_blur')

        completeness_pass = len(missing_docs) == 0
        applicant['checks']['completeness'] = {
            'status': 'PASS' if completeness_pass else 'FAIL',
            'missing_documents': missing_docs,
            'details': 'All required documents present and valid' if completeness_pass else f'Document defect/missing: {", ".join(missing_docs)}'
        }

        # Check 2: Registry Status Check
        reg_gst = applicant['registry']['gstin']
        reg_u = applicant['registry']['udyam']
        gst_status = reg_gst['status'] if reg_gst else None
        
        status_pass = True
        status_flags = []
        if code == 'K02':
            if not reg_u:
                status_pass = False
                status_flags.append('Udyam registration not found')
        else:
            if not reg_gst:
                status_pass = False
                status_flags.append('GSTIN registration not found in registry')
            elif gst_status != 'Active':
                status_pass = False
                status_flags.append(f'GSTIN status is {gst_status} (Expected: Active)')

        applicant['checks']['registry_status'] = {
            'status': 'PASS' if status_pass else 'FAIL',
            'gstin_status': gst_status,
            'udyam_verified': bool(reg_u),
            'flags': status_flags
        }

        # Check 3: Entity & Signatory Fuzzy Match
        ocr_trade = (
            applicant['documents']['address_proof'].get('trade_name') or
            applicant['documents']['gst_certificate'].get('trade_name') or
            applicant['documents']['udyam_certificate'].get('trade_name') or ''
        )
        ocr_signatory = applicant['documents']['signatory_id'].get('signatory_name') or ''
        
        reg_trade = (
            (reg_gst.get('trade_name') if reg_gst and reg_gst.get('trade_name') else '') or
            (reg_u.get('enterprise_name') if reg_u else '') or
            (reg_gst.get('legal_name') if reg_gst else '')
        )
        reg_legal = (reg_gst.get('legal_name') if reg_gst else (reg_u.get('enterprise_name') if reg_u else ''))

        trade_sim = fuzz.token_set_ratio(ocr_trade.lower(), reg_trade.lower())
        
        # Check internal document trade discrepancy (e.g. Legal name: Neha Banerjee (Prop. Shri Physio Clinic) vs Trade: Neelgiri Physio Clinic)
        ocr_gst_legal = applicant['documents']['gst_certificate'].get('legal_name') or ''
        prop_m = re.search(r'Prop\.\s*(.*?)\)', ocr_gst_legal, re.IGNORECASE)
        prop_trade_name = prop_m.group(1).strip() if prop_m else None
        internal_prop_sim = fuzz.token_set_ratio(prop_trade_name.lower(), reg_trade.lower()) if prop_trade_name else 100

        signatory_sim = fuzz.partial_ratio(ocr_signatory.lower(), reg_legal.lower())
        is_entity_firm = 'LLP' in reg_legal or 'Pvt Ltd' in reg_legal or 'Limited' in reg_legal
        signatory_pass = (signatory_sim >= 70) if not is_entity_firm else bool(ocr_signatory)

        fuzzy_pass = (trade_sim >= 85) and (internal_prop_sim >= 85) and signatory_pass
        fuzzy_flags = []
        if trade_sim < 85:
            fuzzy_flags.append(f'Entity name mismatch ({trade_sim:.1f}%): OCR "{ocr_trade}" vs Registry "{reg_trade}"')
        if internal_prop_sim < 85 and prop_trade_name:
            fuzzy_flags.append(f'Certificate proprietor trade name mismatch ({internal_prop_sim:.1f}%): "{prop_trade_name}" vs Registry "{reg_trade}"')
        if not signatory_pass:
            fuzzy_flags.append(f'Signatory ID mismatch: "{ocr_signatory}" not found on record')

        applicant['checks']['entity_fuzzy_match'] = {
            'status': 'PASS' if fuzzy_pass else ('WARN' if (trade_sim >= 60 and internal_prop_sim >= 60) else 'FAIL'),
            'trade_name_similarity': round(trade_sim, 1),
            'proprietor_trade_similarity': round(internal_prop_sim, 1),
            'signatory_similarity': round(signatory_sim, 1),
            'flags': fuzzy_flags
        }

        # Check 4: Address & Recency Alignment
        ocr_pin = (
            applicant['documents']['address_proof'].get('pincode') or
            applicant['documents']['gst_certificate'].get('pincode')
        )
        reg_pin = reg_gst.get('pincode') if reg_gst else None
        pin_match = (ocr_pin == reg_pin) if (ocr_pin and reg_pin) else True

        bill_date_str = applicant['documents']['address_proof'].get('issue_date')
        date_valid = True
        days_old = 0
        if bill_date_str:
            try:
                b_date = datetime.strptime(bill_date_str, "%Y-%m-%d")
                days_old = (TODAY_ANCHOR - b_date).days
                if days_old > 90:
                    date_valid = False
            except Exception:
                pass

        addr_flags = []
        if not pin_match:
            addr_flags.append(f'Pincode mismatch: OCR {ocr_pin} vs Registry {reg_pin}')
        if not date_valid:
            addr_flags.append(f'Address proof dated {bill_date_str} is {days_old} days old (>90 days limit)')

        applicant['checks']['address_alignment'] = {
            'status': 'PASS' if (pin_match and date_valid) else ('WARN' if not date_valid else 'FAIL'),
            'pincode_match': pin_match,
            'days_old': days_old,
            'bill_date': bill_date_str,
            'flags': addr_flags
        }

        # Scorecard Verdict
        if not completeness_pass or (gst_status in ['Cancelled', 'Suspended']):
            verdict = 'RED'
        elif not date_valid or not fuzzy_pass:
            verdict = 'AMBER'
        else:
            verdict = 'GREEN'

        all_flags = []
        all_flags.extend(applicant['checks']['completeness']['missing_documents'])
        all_flags.extend(status_flags)
        all_flags.extend(fuzzy_flags)
        all_flags.extend(addr_flags)

        applicant['scorecard']['verdict'] = verdict
        applicant['scorecard']['flags'] = all_flags
        applicant['scorecard']['field_diffs'] = [
            {'field': 'Entity / Trade Name', 'ocr': ocr_trade, 'registry': reg_trade, 'match': trade_sim >= 85, 'score': round(trade_sim, 1)},
            {'field': 'Signatory Name', 'ocr': ocr_signatory, 'registry': reg_legal, 'match': signatory_pass, 'score': round(signatory_sim, 1)},
            {'field': 'Pincode', 'ocr': ocr_pin or 'N/A', 'registry': reg_pin or 'N/A', 'match': pin_match},
            {'field': 'GSTIN Registry Status', 'ocr': gst_id or 'N/A', 'registry': gst_status or 'Udyam Exemption', 'match': gst_status == 'Active' if gst_id else True},
            {'field': 'Address Proof Recency', 'ocr': bill_date_str or 'N/A', 'registry': f'Within 90 days ({days_old}d)', 'match': date_valid}
        ]

        ground_truth[code] = applicant
        print(f"  Verdict: {verdict} | Flags: {all_flags}")

    out_file = os.path.join(base_dir, 'data', 'k01_k12_ground_truth.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(ground_truth, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved ground truth to {out_file}")
    conn.close()

if __name__ == '__main__':
    asyncio.run(build_ground_truth())
