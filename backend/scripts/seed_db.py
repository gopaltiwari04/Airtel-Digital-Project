import os
import re
import sqlite3
import pandas as pd

def seed_database():
    data_dir = os.path.join(os.path.dirname(__file__), '..', '..', '6ae1873397bc1_digital', 'YTL_TrackA_Udyam_Digital_Data')
    db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'airtel_sync.db')

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    print(f"Seeding database at: {os.path.abspath(db_path)}")

    # 1. Product Catalogue
    prod_csv = os.path.join(data_dir, 'product_catalogue.csv')
    df_p = pd.read_csv(prod_csv)
    df_p['monthly_recurring_charge'] = df_p['price_min_inr_per_month'].astype(float)
    df_p['one_time_setup_fee'] = df_p['one_time_setup_inr'].astype(float)
    df_p['min_tenure_months'] = df_p['min_contract_months'].astype(int)
    df_p['target_business_vertical'] = df_p['target_segments'].fillna('').astype(str)

    cur.execute("DROP TABLE IF EXISTS products;")
    cur.execute("""
        CREATE TABLE products (
            product_id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            product_name TEXT NOT NULL,
            description TEXT,
            unit TEXT,
            price_min_inr_per_month REAL,
            price_max_inr_per_month REAL,
            monthly_recurring_charge REAL,
            one_time_setup_fee REAL,
            min_tenure_months INTEGER,
            available_city_tiers TEXT,
            min_employees INTEGER,
            min_sites INTEGER,
            requires_gstin TEXT,
            requires_one_of TEXT,
            typical_install_days INTEGER,
            target_business_vertical TEXT
        );
    """)

    for _, row in df_p.iterrows():
        cur.execute("""
            INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(row['product_id']),
            str(row['category']),
            str(row['product_name']),
            str(row['description']),
            str(row['unit']),
            float(row['price_min_inr_per_month']),
            float(row['price_max_inr_per_month']),
            float(row['monthly_recurring_charge']),
            float(row['one_time_setup_fee']),
            int(row['min_tenure_months']),
            str(row['available_city_tiers']),
            int(row['min_employees']),
            int(row['min_sites']),
            str(row['requires_gstin']),
            str(row['requires_one_of']) if pd.notna(row['requires_one_of']) else None,
            int(row['typical_install_days']),
            str(row['target_business_vertical'])
        ))

    cur.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_products_vertical ON products(target_business_vertical);")
    print(f"Loaded {len(df_p)} products into 'products' table.")

    # 2. GSTIN Registry
    gst_csv = os.path.join(data_dir, 'mock_gstin_registry.csv')
    df_gst = pd.read_csv(gst_csv)

    cur.execute("DROP TABLE IF EXISTS gstin_registry;")
    cur.execute("""
        CREATE TABLE gstin_registry (
            gstin TEXT PRIMARY KEY,
            legal_name TEXT NOT NULL,
            trade_name TEXT,
            constitution TEXT,
            principal_place_of_business TEXT,
            pincode TEXT,
            state TEXT,
            registration_date TEXT,
            status TEXT
        );
    """)

    gst_rows = []
    for _, row in df_gst.iterrows():
        addr = str(row['principal_place_of_business'])
        m = re.search(r'\b(\d{6})\b', addr)
        pincode = m.group(1) if m else None
        gst_rows.append((
            str(row['gstin']),
            str(row['legal_name']),
            str(row['trade_name']) if pd.notna(row['trade_name']) else None,
            str(row['constitution']),
            addr,
            pincode,
            str(row['state']),
            str(row['registration_date']),
            str(row['status'])
        ))

    cur.executemany("""
        INSERT INTO gstin_registry VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, gst_rows)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_gstin_legal_name ON gstin_registry(legal_name);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gstin_pincode ON gstin_registry(pincode);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_gstin_status ON gstin_registry(status);")
    print(f"Loaded {len(df_gst)} records into 'gstin_registry' table with indexes.")

    # 3. Udyam Registry
    udyam_csv = os.path.join(data_dir, 'mock_udyam_registry.csv')
    df_u = pd.read_csv(udyam_csv)

    cur.execute("DROP TABLE IF EXISTS udyam_registry;")
    cur.execute("""
        CREATE TABLE udyam_registry (
            udyam_number TEXT PRIMARY KEY,
            enterprise_name TEXT NOT NULL,
            enterprise_type TEXT,
            major_activity TEXT,
            nic_description TEXT,
            state TEXT,
            city TEXT,
            date_of_registration TEXT
        );
    """)

    u_rows = []
    for _, row in df_u.iterrows():
        u_rows.append((
            str(row['udyam_number']),
            str(row['enterprise_name']),
            str(row['enterprise_type']),
            str(row['major_activity']),
            str(row['nic_description']),
            str(row['state']),
            str(row['city']),
            str(row['date_of_registration'])
        ))

    cur.executemany("""
        INSERT INTO udyam_registry VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, u_rows)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_udyam_enterprise_name ON udyam_registry(enterprise_name);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_udyam_city ON udyam_registry(city);")
    print(f"Loaded {len(df_u)} records into 'udyam_registry' table with indexes.")

    # 4. SMB Leads
    leads_csv = os.path.join(data_dir, 'smb_leads.csv')
    df_l = pd.read_csv(leads_csv)

    cur.execute("DROP TABLE IF EXISTS smb_leads;")
    cur.execute("""
        CREATE TABLE smb_leads (
            lead_id TEXT PRIMARY KEY,
            created_date TEXT,
            lead_source TEXT,
            business_name TEXT,
            business_type TEXT,
            segment TEXT,
            city TEXT,
            city_tier INTEGER,
            state TEXT,
            preferred_language TEXT,
            employee_count INTEGER,
            num_sites INTEGER,
            annual_turnover_band TEXT,
            has_gstin TEXT,
            gstin TEXT,
            has_udyam TEXT,
            udyam_number TEXT,
            current_internet TEXT,
            current_provider TEXT,
            monthly_telecom_spend_inr REAL,
            products_of_interest TEXT,
            contact_name TEXT,
            contact_role TEXT,
            stage_reached TEXT,
            outcome TEXT,
            drop_reason TEXT,
            contacted_date TEXT,
            bundle_products TEXT,
            monthly_bundle_value_inr REAL,
            one_time_setup_inr REAL,
            contract_months INTEGER,
            churned_within_6_months TEXT,
            nps_score REAL,
            acquisition_cost_inr REAL
        );
    """)

    lead_cols = [
        'lead_id', 'created_date', 'lead_source', 'business_name', 'business_type', 'segment',
        'city', 'city_tier', 'state', 'preferred_language', 'employee_count', 'num_sites',
        'annual_turnover_band', 'has_gstin', 'gstin', 'has_udyam', 'udyam_number',
        'current_internet', 'current_provider', 'monthly_telecom_spend_inr', 'products_of_interest',
        'contact_name', 'contact_role', 'stage_reached', 'outcome', 'drop_reason',
        'contacted_date', 'bundle_products', 'monthly_bundle_value_inr', 'one_time_setup_inr',
        'contract_months', 'churned_within_6_months', 'nps_score', 'acquisition_cost_inr'
    ]

    lead_rows = []
    for _, row in df_l.iterrows():
        lead_rows.append(tuple(row[col] if pd.notna(row[col]) else None for col in lead_cols))

    cur.executemany(f"""
        INSERT INTO smb_leads VALUES ({','.join(['?']*len(lead_cols))})
    """, lead_rows)

    cur.execute("CREATE INDEX IF NOT EXISTS idx_leads_stage ON smb_leads(stage_reached);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_leads_outcome ON smb_leads(outcome);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_leads_segment ON smb_leads(segment);")
    print(f"Loaded {len(df_l)} records into 'smb_leads' table.")

    # 5. Orders and DPDP Consent Tables
    cur.execute("""
        CREATE TABLE IF NOT EXISTS kyc_consents (
            consent_id TEXT PRIMARY KEY,
            customer_identifier TEXT NOT NULL,
            purpose_scope TEXT NOT NULL,
            retention_policy TEXT NOT NULL,
            user_language TEXT NOT NULL,
            ip_address TEXT,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            business_name TEXT NOT NULL,
            bundle_name TEXT NOT NULL,
            contract_tenure_months INTEGER NOT NULL,
            monthly_recurring_charge REAL NOT NULL,
            one_time_setup_fee REAL NOT NULL,
            gst_amount REAL NOT NULL,
            total_monthly_bill REAL NOT NULL,
            provisioning_stage TEXT NOT NULL,
            installation_address TEXT,
            scheduled_engineer_slot TEXT,
            whatsapp_logs TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)

    conn.commit()
    conn.close()
    print("Database seeding completed successfully.")

if __name__ == '__main__':
    seed_database()
