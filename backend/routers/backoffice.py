from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.services.propensity_engine import get_backoffice_leads, generate_call_script

router = APIRouter(prefix="/api/backoffice", tags=["Back-Office & Channel Partner"])

class OverrideRequest(BaseModel):
    partner_id: str = "PARTNER-P991"
    note: str
    action: str = "APPROVE"

@router.get("/leads")
def list_leads(
    queue: Optional[str] = Query(None, description="Self-Serve Digital | Assisted Partner Queue | Field Sales Queue | ALL"),
    stage: Optional[str] = Query(None, description="Funnel stage filter"),
    search: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, description="Max leads to return")
):
    return get_backoffice_leads(
        queue_filter=queue,
        stage_filter=stage,
        search=search,
        limit=limit
    )

@router.get("/leads/{lead_id}/details")
def lead_details(lead_id: str):
    script = generate_call_script(lead_id)
    return {
        'lead_id': lead_id,
        'call_script': script
    }

@router.post("/leads/{lead_id}/override")
def partner_override(lead_id: str, req: OverrideRequest):
    return {
        'lead_id': lead_id,
        'override_status': 'APPROVED_BY_PARTNER',
        'partner_id': req.partner_id,
        'note': req.note,
        'message': f"Minor discrepancy overridden by channel partner {req.partner_id}. Lead pushed to provisioning queue."
    }
