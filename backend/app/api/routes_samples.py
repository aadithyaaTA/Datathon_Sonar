from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import settings
from app.services.sample_generator import generate_sample_dataset

router = APIRouter(prefix="/api/samples", tags=["Samples"])

@router.get("")
async def get_sample_presets():
    """Returns available sample sonar scenarios with navigation metadata."""
    presets = generate_sample_dataset()
    return presets

@router.get("/{filename}")
async def get_sample_image(filename: str):
    """Serves the raw image file for a given sample scenario."""
    file_path = settings.SAMPLES_DIR / filename
    if not file_path.exists():
        # regenerate if missing
        generate_sample_dataset()
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Sample image not found.")
    return FileResponse(file_path, media_type="image/png")
