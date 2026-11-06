from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.services.kyc_engine import (
    record_dpdp_consent,
    lookup_registry,
    verify_kyc_application,
    get_all_specimens,
    get_specimen_details
)

router = APIRouter(prefix="/api/kyc", tags=["Smart KYC"])

class ConsentRequest(BaseModel):
    customer_identifier: str
    user_language: Optional[str] = "en"
    ip_address: Optional[str] = "127.0.0.1"

class VerifyRequest(BaseModel):
    applicant_id: Optional[str] = None
    custom_ocr: Optional[Dict[str, Any]] = None

@router.post("/consent")
def save_consent(req: ConsentRequest):
    return record_dpdp_consent(
        customer_identifier=req.customer_identifier,
        user_language=req.user_language or "en",
        ip_address=req.ip_address or "127.0.0.1"
    )

@router.get("/lookup")
def registry_lookup(
    gstin: Optional[str] = Query(None, description="15-character GSTIN"),
    udyam_number: Optional[str] = Query(None, description="Udyam registration number")
):
    return lookup_registry(gstin=gstin, udyam_number=udyam_number)

@router.post("/verify")
def verify_kyc(req: VerifyRequest):
    return verify_kyc_application(
        applicant_id=req.applicant_id,
        custom_ocr=req.custom_ocr
    )

@router.get("/specimens")
def list_specimens():
    return get_all_specimens()

@router.get("/specimens/{applicant_id}")
def specimen_detail(applicant_id: str):
    data = get_specimen_details(applicant_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Specimen {applicant_id} not found")
    return data
