import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    APP_NAME: str = "SonarSentinel API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    MODEL_PATH: Path = BASE_DIR / "models" / "sonarsentinel.pt"
    ONNX_MODEL_PATH: Path = BASE_DIR / "models" / "sonarsentinel.onnx"
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    REPORT_DIR: Path = BASE_DIR / "data" / "reports"
    SAMPLES_DIR: Path = BASE_DIR / "data" / "samples"
    
    # Physics-Informed Acoustic Filter Weights (Configurable Prototype Heuristic)
    WEIGHT_MODEL_CONFIDENCE: float = 0.65
    WEIGHT_ACOUSTIC_PHYSICS: float = 0.35
    
    # Hazard Severity Classification Thresholds (Final Blended Score)
    THRESHOLD_CRITICAL: float = 0.80
    THRESHOLD_HIGH: float = 0.65
    THRESHOLD_MEDIUM: float = 0.45
    
    # Acoustic Filter Heuristic Thresholds
    SHADOW_SEARCH_DISTANCE_PX: int = 120
    SHADOW_MIN_DARKNESS_RATIO: float = 0.60
    HIGHLIGHT_MIN_BRIGHTNESS_RATIO: float = 1.25
    
    # Default Navigation & Sonar Calibration
    DEFAULT_SWATH_WIDTH_METERS: float = 100.0  # Total swath width across track
    DEFAULT_BEAM_LOOK_DIRECTION: str = "starboard"  # "port", "starboard", or "both"
    
    # Supported Target Classes
    TARGET_CLASSES: list[str] = [
        "ghost_net",
        "cylinder",
        "pipe",
        "wreckage",
        "unknown_anomaly"
    ]

settings = Settings()

# Ensure required runtime directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORT_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
