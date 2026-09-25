from loguru import logger
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.api import routes_health, routes_analysis, routes_reports, routes_samples
from app.services.sample_generator import generate_sample_dataset
from app.services.detector import detector_manager

# Configure logging
class InterceptHandler(logging.Handler):
    def emit(self, record):
        logger.opt(depth=6, exception=record.exc_info).log(
            record.levelname, record.getMessage()
        )
logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure sample data is generated and directories exist
    logger.info("Initializing SonarSentinel Backend Services...")
    try:
        from app.database import engine, Base
        from app.models import db_models
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database initialized.")
        
        generate_sample_dataset()
        logger.info("Synthetic sonar dataset initialized.")
    except Exception as e:
        logger.warning(f"Could not initialize sample dataset: {e}")
        
    logger.info("Loading AI models in background...")
    await detector_manager.load_models()
    logger.info("AI models ready.")
        
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
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "details": [
                {"field": list(e["loc"]), "message": e["msg"], "type": e["type"]}
                for e in exc.errors()
            ]
        }
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTP exception on {request.url}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "HTTP Error", "message": exc.detail}
    )

# Exception handler for smooth UX during hackathons
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Global error on {request.url}: {exc}")
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
