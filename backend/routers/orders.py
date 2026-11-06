from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.services.state_machine import create_order, get_order_tracker, reschedule_engineer_slot

router = APIRouter(prefix="/api/orders", tags=["Orders & Provisioning"])

class CreateOrderRequest(BaseModel):
    customer_name: str
    business_name: str
    bundle_name: str
    contract_tenure_months: int = 24
    monthly_recurring_charge: float
    one_time_setup_fee: float = 0.0
    gst_amount: float
    total_monthly_bill: float
    installation_address: Optional[str] = "Shop 12, Commercial Complex, MG Road"

class RescheduleRequest(BaseModel):
    new_slot: str

@router.post("/create")
def place_order(req: CreateOrderRequest):
    return create_order(
        customer_name=req.customer_name,
        business_name=req.business_name,
        bundle_name=req.bundle_name,
        contract_tenure_months=req.contract_tenure_months,
        monthly_recurring_charge=req.monthly_recurring_charge,
        one_time_setup_fee=req.one_time_setup_fee,
        gst_amount=req.gst_amount,
        total_monthly_bill=req.total_monthly_bill,
        installation_address=req.installation_address or "Shop 12, Commercial Complex, MG Road"
    )

@router.get("/{order_id}/tracker")
def order_tracker(order_id: str):
    res = get_order_tracker(order_id)
    if not res:
        raise HTTPException(status_code=404, detail="Order not found")
    return res

@router.post("/{order_id}/reschedule")
def reschedule_order(order_id: str, req: RescheduleRequest):
    return reschedule_engineer_slot(order_id=order_id, new_slot=req.new_slot)
