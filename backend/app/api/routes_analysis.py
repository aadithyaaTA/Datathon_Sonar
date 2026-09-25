import uuid
import time
import cv2
import numpy as np
from starlette.concurrency import run_in_threadpool
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.database import get_db
from app.models import db_models
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

router = APIRouter(prefix="/api", tags=["Analysis"])

# In-memory mission store for fast retrieval and export during the session (backward compatibility)
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
    class_bgr_map = {
        "ghost_net": (8, 200, 234),       # Yellow/Gold (BGR)
        "wreckage": (68, 68, 239),        # Red (BGR)
        "pipe": (246, 130, 59),           # Blue (BGR)
        "cylinder": (11, 158, 245),       # Amber (BGR)
        "unknown_anomaly": (184, 163, 148)# Slate Gray (BGR)
    }

    h_img, w_img = annotated.shape[:2]
    base_scale = max(h_img, w_img) / 1000.0
    thickness = max(2, int(2 * base_scale))
    font_scale = max(0.38, 0.38 * base_scale)

    for det in detections:
        box = det.bbox
        x1, y1 = int(box.x1), int(box.y1)
        x2, y2 = int(box.x2), int(box.y2)
        color = class_bgr_map.get(det.class_name, (184, 163, 148))

        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)
        
        corner_len = min(int(12 * base_scale), int((x2 - x1) * 0.25))
        cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), color, thickness + 1)
        cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), color, thickness + 1)
        cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), color, thickness + 1)
        cv2.line(annotated, (x2, y1), (x2, y1 + corner_len), color, thickness + 1)
        cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), color, thickness + 1)
        cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), color, thickness + 1)
        cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), color, thickness + 1)
        cv2.line(annotated, (x2, y2), (x2, y2 - corner_len), color, thickness + 1)

        shadow_icon = "[SHDW]" if det.shadow_detected else "[NO-SHDW]"
        label_top = f"{det.class_name.upper()} | {det.hazard_level} {int(det.final_score * 100)}%"
        label_sub = f"AI:{int(det.model_confidence*100)}% PHY:{int(det.acoustic_score*100)}% {shadow_icon}"
        
        (tw, th), _ = cv2.getTextSize(label_top, cv2.FONT_HERSHEY_SIMPLEX, font_scale * 1.1, thickness)
        badge_y1 = max(0, y1 - int(32 * base_scale))
        cv2.rectangle(annotated, (x1, badge_y1), (x1 + max(tw + int(12 * base_scale), int(195 * base_scale)), y1), (12, 16, 24), -1)
        cv2.rectangle(annotated, (x1, badge_y1), (x1 + max(tw + int(12 * base_scale), int(195 * base_scale)), y1), color, max(1, thickness - 1))
        
        cv2.putText(annotated, label_top, (x1 + int(4 * base_scale), badge_y1 + int(13 * base_scale)), cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, max(1, thickness - 1), cv2.LINE_AA)
        cv2.putText(annotated, label_sub, (x1 + int(4 * base_scale), badge_y1 + int(26 * base_scale)), cv2.FONT_HERSHEY_SIMPLEX, font_scale * 0.9, (200, 200, 200), max(1, thickness - 1), cv2.LINE_AA)

    return annotated


def process_image_pipeline_sync(image_bytes, nav_data, force_mode=None):
    """
    CPU-heavy synchronous image processing pipeline to be run in a separate thread.
    """
    raw_image = load_image_from_bytes(image_bytes)
    preproc = preprocess_sonar_image(raw_image)
    proc_bgr = preproc["processed_bgr"]
    gray_img = preproc["processed"]
    h, w = preproc["height"], preproc["width"]

    raw_detections, active_mode = detector_manager.detect(proc_bgr, force_mode=force_mode)

    # 5. Physics-Informed Filter & Geolocation Engine
    detection_results: list[DetectionResult] = []
    
    for idx, d in enumerate(raw_detections):
        det_id = f"DET-{idx+1:02d}"
        bbox = d["bbox"]
        class_name = d["class_name"]
        model_conf = d["confidence"]

        physics_details, acoustic_score, notes = analyze_acoustic_physics(
            image_gray=gray_img, bbox=bbox, sonar_type="sidescan", look_direction="auto"
        )

        final_score = round(float(settings.WEIGHT_MODEL_CONFIDENCE * model_conf + settings.WEIGHT_ACOUSTIC_PHYSICS * acoustic_score), 2)
        hazard_level = calculate_hazard_level(final_score, class_name)

        geo_details = estimate_wgs84_coordinates(bbox=bbox, image_width=w, image_height=h, nav=nav_data)

        cx1, cy1, cx2, cy2 = max(0, int(bbox.x1)), max(0, int(bbox.y1)), min(w, int(bbox.x2)), min(h, int(bbox.y2))
        crop_img = gray_img[cy1:cy2, cx1:cx2]
        crop_b64 = encode_image_to_base64(crop_img) if crop_img.size > 0 else None

        detection_results.append(DetectionResult(
            id=det_id, class_name=class_name, model_confidence=model_conf,
            acoustic_score=acoustic_score, final_score=final_score, hazard_level=hazard_level,
            bbox=bbox, shadow_detected=physics_details.shadow_detected,
            latitude=geo_details.latitude, longitude=geo_details.longitude,
            physics_details=physics_details, geo_details=geo_details, crop_image_url=crop_b64
        ))

    annotated = annotate_detection_image(proc_bgr, detection_results)

    orig_b64 = encode_image_to_base64(preproc["original"])
    proc_b64 = encode_image_to_base64(proc_bgr)
    annot_b64 = encode_image_to_base64(annotated)

    return w, h, active_mode, detection_results, orig_b64, proc_b64, annot_b64

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

    # 2. Navigation Context
    nav = NavigationMetadata(
        vessel_lat=vessel_lat,
        vessel_lon=vessel_lon,
        heading=heading,
        altitude=altitude,
        swath_width_m=swath_width_m,
        mission_name=mission_name
    )

    # 3. Threadpool Pipeline
    w, h, active_mode, detection_results, orig_b64, proc_b64, annot_b64 = await run_in_threadpool(
        _run_pipeline, raw_image, nav, force_mode
    )

    mission_id = f"MSN-{uuid.uuid4().hex[:8].upper()}"
    timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

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

    elapsed_ms = int((time.time() - start_time) * 1000.0)

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

    # Save to SQLite DB
    db_mission = db_models.Mission(
        id=mission_id,
        mission_name=mission_name,
        timestamp=timestamp_dt,
        vessel_lat=vessel_lat,
        vessel_lon=vessel_lon,
        heading=heading,
        altitude=altitude,
        swath_width_m=swath_width_m,
        image_width=w,
        image_height=h,
        processing_time_ms=elapsed_ms,
        original_image_url=orig_b64,
        preprocessed_image_url=proc_b64,
        annotated_image_url=annot_b64
    )
    db.add(db_mission)
    
    for det in detection_results:
        db_det = db_models.Detection(
            id=f"{mission_id}-{det.id}",
            mission_id=mission_id,
            class_name=det.class_name,
            model_confidence=det.model_confidence,
            acoustic_score=det.acoustic_score,
            final_score=det.final_score,
            hazard_level=det.hazard_level,
            bbox_x1=det.bbox.x1,
            bbox_y1=det.bbox.y1,
            bbox_x2=det.bbox.x2,
            bbox_y2=det.bbox.y2,
            bbox_width=det.bbox.width,
            bbox_height=det.bbox.height,
            shadow_detected=det.physics_details.shadow_detected,
            highlight_mean=det.physics_details.highlight_mean_intensity,
            shadow_mean=det.physics_details.shadow_mean_intensity,
            contrast_ratio=det.physics_details.contrast_ratio,
            shadow_length_px=det.physics_details.shadow_length_px,
            heuristic_notes=det.physics_details.heuristic_notes,
            latitude=det.geo_details.latitude,
            longitude=det.geo_details.longitude,
            distance_from_nadir=det.geo_details.distance_from_nadir_m,
            is_port_side=det.geo_details.is_port_side,
            crop_image_url=det.crop_image_url
        )
        db.add(db_det)
    
    await db.commit()
    
    MISSION_STORE[mission_id] = response
    return response

@router.get("/detections", response_model=list[AnalysisResponse])
async def list_recent_missions(db: AsyncSession = Depends(get_db)):
    # Very basic history route replacement for now
    # We reconstruct AnalysisResponse from DB
    stmt = select(db_models.Mission).order_by(db_models.Mission.timestamp.desc()).limit(10)
    result = await db.execute(stmt)
    missions = result.scalars().all()
    
    responses = []
    for m in missions:
        # In a real app we'd load the detections eagerly using joinedload, but this is a stub
        responses.append({
            "mission_id": m.id,
            "timestamp": m.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "mode": "UNKNOWN",
            "model_name": "DB-History",
            "image_width": m.image_width,
            "image_height": m.image_height,
            "original_image_url": m.original_image_url,
            "preprocessed_image_url": m.preprocessed_image_url,
            "annotated_image_url": m.annotated_image_url,
            "detections": [], # Stubbed for list view to save bandwidth
            "summary": AnalysisSummary(total_detections=0, critical_hazards=0, high_hazards=0, medium_hazards=0, low_hazards=0, ghost_nets=0, wreckages=0, pipes=0, cylinders=0, unknown_anomalies=0),
            "navigation": NavigationMetadata(vessel_lat=m.vessel_lat, vessel_lon=m.vessel_lon, heading=m.heading, altitude=m.altitude, swath_width_m=m.swath_width_m, mission_name=m.mission_name),
            "processing_time_ms": m.processing_time_ms
        })
    return responses

@router.get("/detections/{mission_id}", response_model=AnalysisResponse)
async def get_mission_detection(mission_id: str, db: AsyncSession = Depends(get_db)):
    # This is a stub for the hackathon context
    raise HTTPException(status_code=404, detail="Fetching specific historical missions from DB is not fully implemented yet.")
