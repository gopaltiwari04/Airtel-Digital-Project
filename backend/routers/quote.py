from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import sqlite3
import os
from backend.services.bundle_engine import recalculate_quote, DB_PATH

router = APIRouter(prefix="/api/quote", tags=["Quote"])

class QuoteItem(BaseModel):
    product_id: str
    quantity: int = 1

class QuoteCalculateRequest(BaseModel):
    items: List[QuoteItem]
    tenure_months: int = 12
    billing_cycle_date: Optional[str] = "1st of every month"

@router.post("/calculate")
def calculate_quote(req: QuoteCalculateRequest):
    items_dict = [{'product_id': it.product_id, 'quantity': it.quantity} for it in req.items]
    res = recalculate_quote(
        items=items_dict,
        tenure_months=req.tenure_months,
        billing_cycle_date=req.billing_cycle_date or "1st of every month"
    )
    return res

@router.get("/products")
def list_products():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM products ORDER BY category, price_min_inr_per_month")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows
