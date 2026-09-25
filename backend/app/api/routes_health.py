import torch
from fastapi import APIRouter
from app.config import settings
from app.models.schemas import HealthStatus
from app.services.detector import detector_manager

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=HealthStatus)
async def health_check():
    """Returns system status, active ML pipeline mode, and hardware availability."""
    cuda_available = False
    device_name = "CPU"
    
    try:
        if torch.cuda.is_available():
            cuda_available = True
            device_name = f"CUDA: {torch.cuda.get_device_name(0)}"
    except Exception:
        pass

    return HealthStatus(
        status="ONLINE",
        version=settings.APP_VERSION,
        mode="AI" if detector_manager.is_ai_loaded else "DEMO",
        model_loaded=detector_manager.is_ai_loaded,
        model_path=str(settings.MODEL_PATH),
        classes=settings.TARGET_CLASSES,
        device=device_name
    )

@router.get("/")
async def root():
    return {
        "project": "SonarSentinel — Automated Underwater Debris & Anomaly Detection",
        "statement": "SIH26057 — Ministry of Earth Sciences (MoES)",
        "status": "OPERATIONAL",
        "api_docs": "/docs"
    }
