import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api import routes_health, routes_analysis, routes_reports, routes_samples
from app.services.sample_generator import generate_sample_dataset

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sonarsentinel")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure sample data is generated and directories exist
    logger.info("Initializing SonarSentinel Backend Services...")
    try:
        generate_sample_dataset()
        logger.info("Synthetic sonar dataset initialized.")
    except Exception as e:
        logger.warning(f"Could not initialize sample dataset: {e}")
        
    yield
    # Shutdown
    logger.info("Shutting down SonarSentinel Services.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Automated Underwater Debris & Anomaly Detection for Ministry of Earth Sciences (MoES)",
    lifespan=lifespan
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for smooth UX during hackathons
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Processing Error",
            "message": str(exc),
            "hint": "Check that the uploaded image is a valid 8-bit or 24-bit PNG/JPG/TIFF side-scan sonar image."
        }
    )

# Include API Routers
app.include_router(routes_health.router)
app.include_router(routes_analysis.router)
app.include_router(routes_reports.router)
app.include_router(routes_samples.router)

# Mount static directories
app.mount("/static/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
app.mount("/static/samples", StaticFiles(directory=str(settings.SAMPLES_DIR)), name="samples")
