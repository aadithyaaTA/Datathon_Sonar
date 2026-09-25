from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X coordinate in pixels")
    y1: float = Field(..., description="Top-left Y coordinate in pixels")
    x2: float = Field(..., description="Bottom-right X coordinate in pixels")
    y2: float = Field(..., description="Bottom-right Y coordinate in pixels")
    width: Optional[float] = None
    height: Optional[float] = None

class AcousticPhysicsDetails(BaseModel):
    shadow_detected: bool = Field(..., description="True if acoustic shadow signature was identified")
    highlight_mean_intensity: float = Field(..., description="Mean pixel intensity in highlight region [0-255]")
    shadow_mean_intensity: float = Field(..., description="Mean pixel intensity in shadow search zone [0-255]")
    contrast_ratio: float = Field(..., description="Ratio of highlight to shadow intensity")
    shadow_length_px: float = Field(..., description="Estimated pixel extent of acoustic shadow")
    acoustic_score: float = Field(..., description="Prototype acoustic physics validation score [0.0 - 1.0]")
    heuristic_notes: str = Field(..., description="Explanation of physics heuristic evaluation")

class GeolocationDetails(BaseModel):
    latitude: float = Field(..., description="Estimated WGS84 latitude")
    longitude: float = Field(..., description="Estimated WGS84 longitude")
    cross_track_m: float = Field(..., description="Estimated cross-track distance from nadir in meters")
    along_track_m: float = Field(..., description="Estimated along-track distance in meters")
    slant_range_m: float = Field(..., description="Calculated acoustic slant range in meters")
    ground_range_m: float = Field(..., description="Estimated Pythagorean ground range in meters")
    estimation_method: str = Field(default="WGS84_Flat_Earth_Sonar_Projection", description="Georeferencing model used")

class DetectionResult(BaseModel):
    id: str = Field(..., description="Unique detection identifier")
    class_name: str = Field(..., description="Target class (e.g. ghost_net, cylinder, pipe, wreckage, unknown_anomaly)")
    model_confidence: float = Field(..., description="YOLO detector confidence [0.0 - 1.0]")
    acoustic_score: float = Field(..., description="Acoustic physics verification score [0.0 - 1.0]")
    final_score: float = Field(..., description="Combined hazard score: 0.65 * confidence + 0.35 * acoustic_score")
    hazard_level: str = Field(..., description="CRITICAL, HIGH, MEDIUM, or LOW")
    bbox: BoundingBox
    shadow_detected: bool
    latitude: float
    longitude: float
    physics_details: AcousticPhysicsDetails
    geo_details: GeolocationDetails
    crop_image_url: Optional[str] = None

class NavigationMetadata(BaseModel):
    vessel_lat: float = Field(default=13.0827, description="Vessel or Towfish Latitude in decimal degrees (e.g. Chennai Coast 13.0827)")
    vessel_lon: float = Field(default=80.2707, description="Vessel or Towfish Longitude in decimal degrees (e.g. 80.2707)")
    heading: float = Field(default=90.0, description="Vessel Compass Heading in degrees [0-360]")
    altitude: float = Field(default=15.0, description="Towfish altitude above seabed in meters")
    swath_width_m: float = Field(default=100.0, description="Total sonar swath coverage width in meters")
    survey_speed_knots: Optional[float] = Field(default=4.0, description="Survey speed in knots")
    mission_name: Optional[str] = Field(default="MoES-Survey-Alpha", description="Mission or survey transect label")

class AnalysisSummary(BaseModel):
    total_detections: int
    critical_hazards: int
    high_hazards: int
    medium_hazards: int
    low_hazards: int
    ghost_nets: int
    wreckages: int
    pipes: int
    cylinders: int
    unknown_anomalies: int

class AnalysisResponse(BaseModel):
    mission_id: str
    timestamp: str
    mode: str = Field(..., description="'DEMO' (Mock/Feature Pipeline) or 'AI' (Trained PyTorch/ONNX Model)")
    model_name: str
    image_width: int
    image_height: int
    original_image_url: str
    preprocessed_image_url: str
    annotated_image_url: str
    detections: List[DetectionResult]
    summary: AnalysisSummary
    navigation: NavigationMetadata
    processing_time_ms: float

class HealthStatus(BaseModel):
    status: str
    version: str
    mode: str
    model_loaded: bool
    model_path: str
    classes: List[str]
    device: str
