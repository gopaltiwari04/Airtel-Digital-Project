import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.routers.advisor import router as advisor_router
from backend.routers.quote import router as quote_router
from backend.routers.kyc import router as kyc_router
from backend.routers.orders import router as orders_router
from backend.routers.backoffice import router as backoffice_router

app = FastAPI(
    title="Airtel Business SYNC API",
    description="Digital-first acquisition, bundle recommendation, DPDP Smart KYC, and provisioning engine for MSMEs.",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount specimen images
kyc_docs_dir = os.path.join(os.path.dirname(__file__), '..', '6ae1873397bc1_digital', 'YTL_TrackA_Udyam_Digital_Data', 'kyc_documents')
if os.path.exists(kyc_docs_dir):
    app.mount("/static/specimens", StaticFiles(directory=kyc_docs_dir), name="specimens")

# Register routers
app.include_router(advisor_router)
app.include_router(quote_router)
app.include_router(kyc_router)
app.include_router(orders_router)
app.include_router(backoffice_router)

@app.get("/health")
def health():
    return {"status": "healthy", "service": "Airtel Business SYNC Backend", "version": "2.0.0"}

@app.get("/")
def root():
    return {
        "message": "Welcome to Airtel Business SYNC Core Engine",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
