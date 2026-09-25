import uuid
import time
import cv2
import numpy as np
from datetime import datetime, timezone
from typing import Optional, Dict
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from app.config import settings
from app.models.schemas import (
    AnalysisResponse, AnalysisSummary, DetectionResult, 
    NavigationMetadata, BoundingBox
)
from app.services.preprocessing import (
    load_image_from_bytes, preprocess_sonar_image, 
    save_image_to_disk, encode_image_to_base64
)
from app.services.acoustic_filter import analyze_acoustic_physics, calculate_hazard_level
from app.services.geolocation import estimate_wgs84_coordinates
from app.services.detector import detector_manager
from app.services.sample_generator import generate_sample_dataset

router = APIRouter(prefix="/api", tags=["Analysis"])

# In-memory mission store for fast retrieval and export during the session
MISSION_STORE: Dict[str, AnalysisResponse] = {}

def annotate_detection_image(
    image: np.ndarray,
    detections: list[DetectionResult]
) -> np.ndarray:
    """Draws tactical bounding boxes matching the locked class color system."""
    annotated = image.copy()
    if len(annotated.shape) == 2:
        annotated = cv2.cvtColor(annotated, cv2.COLOR_GRAY2BGR)

    # Locked Class -> BGR Color Mapping
    # ghost_net=Yellow, wreckage=Red, pipe=Blue, cylinder=Amber, unknown_anomaly=Gray
    class_bgr_map = {
        "ghost_net": (8, 200, 234),       # Yellow/Gold (BGR)
        "wreckage": (68, 68, 239),        # Red (BGR)
        "pipe": (246, 130, 59),           # Blue (BGR)
        "cylinder": (11, 158, 245),       # Amber (BGR)
        "unknown_anomaly": (184, 163, 148)# Slate Gray (BGR)
    }

    for det in detections:
        box = det.bbox
        x1, y1 = int(box.x1), int(box.y1)
        x2, y2 = int(box.x2), int(box.y2)
        color = class_bgr_map.get(det.class_name, (184, 163, 148))

        # 1. Main target bounding box with corner accents
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        
        # Tactical corner brackets
        corner_len = min(12, int((x2 - x1) * 0.25))
        cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), color, 3)
        cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), color, 3)
        cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), color, 3)
        cv2.line(annotated, (x2, y1), (x2, y1 + corner_len), color, 3)
        cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), color, 3)
        cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), color, 3)
        cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), color, 3)
        cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), color, 3)

        # 2. Label badge
        shadow_icon = "[SHDW]" if det.shadow_detected else "[NO-SHDW]"
        label_top = f"{det.class_name.upper()} | {det.hazard_level} {int(det.final_score * 100)}%"
        label_sub = f"AI:{int(det.model_confidence*100)}% PHY:{int(det.acoustic_score*100)}% {shadow_icon}"
        
        (tw, th), _ = cv2.getTextSize(label_top, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
        badge_y1 = max(0, y1 - 32)
        cv2.rectangle(annotated, (x1, badge_y1), (x1 + max(tw + 12, 195), y1), (12, 16, 24), -1)
        cv2.rectangle(annotated, (x1, badge_y1), (x1 + max(tw + 12, 195), y1), color, 1)
        
        cv2.putText(annotated, label_top, (x1 + 4, badge_y1 + 13), cv2.FONT_HERSHEY_SIMPLEX, 0.38, color, 1, cv2.LINE_AA)
        cv2.putText(annotated, label_sub, (x1 + 4, badge_y1 + 26), cv2.FONT_HERSHEY_SIMPLEX, 0.34, (200, 200, 200), 1, cv2.LINE_AA)

    return annotated

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_sonar_image(
    file: UploadFile = File(...),
    vessel_lat: float = Form(13.0827),
    vessel_lon: float = Form(80.2707),
    heading: float = Form(90.0),
    altitude: float = Form(15.0),
    swath_width_m: float = Form(100.0),
    mission_name: str = Form("MoES-Survey-Alpha"),
    force_mode: Optional[str] = Form(None)
):
    """
    Main Ingestion & Analysis Pipeline:
    Ingestion -> Bilateral Despeckling + CLAHE -> YOLO / Feature Detection ->
    Physics-Informed Acoustic Shadow Filter -> Geolocation -> Annotated Imagery.
    """
    start_time = time.time()
    
    # 1. Validate & Read File
    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        raw_image = load_image_from_bytes(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

    # 2. Preprocess Sonar Image
    preproc = preprocess_sonar_image(raw_image)
    proc_bgr = preproc["processed_bgr"]
    gray_img = preproc["processed"]
    h, w = preproc["height"], preproc["width"]

    # 3. Model Inference (YOLO / Demo Fallback)
    raw_detections, active_mode = detector_manager.detect(proc_bgr, force_mode=force_mode)

    # 4. Navigation Context
    nav = NavigationMetadata(
        vessel_lat=vessel_lat,
        vessel_lon=vessel_lon,
        heading=heading,
        altitude=altitude,
        swath_width_m=swath_width_m,
        mission_name=mission_name
    )

    mission_id = f"MSN-{uuid.uuid4().hex[:8].upper()}"
    timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # 5. Physics-Informed Filter & Geolocation Engine
    detection_results: list[DetectionResult] = []
    
    for idx, d in enumerate(raw_detections):
        det_id = f"DET-{idx+1:02d}"
        bbox = d["bbox"]
        class_name = d["class_name"]
        model_conf = d["confidence"]

        # Physics Filter
        physics_details, acoustic_score, notes = analyze_acoustic_physics(
            image_gray=gray_img,
            bbox=bbox,
            sonar_type="sidescan",
            look_direction="auto"
        )

        # Combined Hazard Score Formula: 0.65 * YOLO + 0.35 * Physics
        w_model = settings.WEIGHT_MODEL_CONFIDENCE
        w_physics = settings.WEIGHT_ACOUSTIC_PHYSICS
        final_score = round(float(w_model * model_conf + w_physics * acoustic_score), 2)
        hazard_level = calculate_hazard_level(final_score, class_name)

        # Geolocation Engine
        geo_details = estimate_wgs84_coordinates(
            bbox=bbox,
            image_width=w,
            image_height=h,
            nav=nav
        )

        # Generate crop thumbnail
        cx1 = max(0, int(bbox.x1))
        cy1 = max(0, int(bbox.y1))
        cx2 = min(w, int(bbox.x2))
        cy2 = min(h, int(bbox.y2))
        crop_img = gray_img[cy1:cy2, cx1:cx2]
        crop_b64 = encode_image_to_base64(crop_img) if crop_img.size > 0 else None

        detection_results.append(DetectionResult(
            id=det_id,
            class_name=class_name,
            model_confidence=model_conf,
            acoustic_score=acoustic_score,
            final_score=final_score,
            hazard_level=hazard_level,
            bbox=bbox,
            shadow_detected=physics_details.shadow_detected,
            latitude=geo_details.latitude,
            longitude=geo_details.longitude,
            physics_details=physics_details,
            geo_details=geo_details,
            crop_image_url=crop_b64
        ))

    # 6. Generate Annotated Overlay
    annotated = annotate_detection_image(proc_bgr, detection_results)

    # Encode images as Data URLs
    orig_b64 = encode_image_to_base64(preproc["original"])
    proc_b64 = encode_image_to_base64(proc_bgr)
    annot_b64 = encode_image_to_base64(annotated)

    # 7. Summary metrics
    summary = AnalysisSummary(
        total_detections=len(detection_results),
        critical_hazards=sum(1 for d in detection_results if d.hazard_level == "CRITICAL"),
        high_hazards=sum(1 for d in detection_results if d.hazard_level == "HIGH"),
        medium_hazards=sum(1 for d in detection_results if d.hazard_level == "MEDIUM"),
        low_hazards=sum(1 for d in detection_results if d.hazard_level == "LOW"),
        ghost_nets=sum(1 for d in detection_results if d.class_name == "ghost_net"),
        wreckages=sum(1 for d in detection_results if d.class_name == "wreckage"),
        pipes=sum(1 for d in detection_results if d.class_name == "pipe"),
        cylinders=sum(1 for d in detection_results if d.class_name == "cylinder"),
        unknown_anomalies=sum(1 for d in detection_results if d.class_name == "unknown_anomaly"),
    )

    elapsed_ms = round((time.time() - start_time) * 1000.0, 1)

    response = AnalysisResponse(
        mission_id=mission_id,
        timestamp=timestamp_str,
        mode=active_mode,
        model_name="YOLOv8n-SonarSentinel" if active_mode == "AI" else "Acoustic-Spectral-DemoEngine",
        image_width=w,
        image_height=h,
        original_image_url=orig_b64,
        preprocessed_image_url=proc_b64,
        annotated_image_url=annot_b64,
        detections=detection_results,
        summary=summary,
        navigation=nav,
        processing_time_ms=elapsed_ms
    )

    MISSION_STORE[mission_id] = response
    return response

@router.get("/detections", response_model=list[AnalysisResponse])
async def list_recent_missions():
    return list(MISSION_STORE.values())

@router.get("/detections/{mission_id}", response_model=AnalysisResponse)
async def get_mission_detection(mission_id: str):
    if mission_id not in MISSION_STORE:
        raise HTTPException(status_code=404, detail="Mission ID not found.")
    return MISSION_STORE[mission_id]
