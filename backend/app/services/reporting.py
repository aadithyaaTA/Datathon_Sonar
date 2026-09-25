import json
import csv
import io
from pathlib import Path
from typing import Dict, Any, List
from app.config import settings
from app.models.schemas import AnalysisResponse

def export_report_json(analysis: AnalysisResponse) -> str:
    """Serializes analysis response to a formatted JSON string."""
    return analysis.model_dump_json(indent=2)

def export_report_csv(analysis: AnalysisResponse) -> str:
    """Generates a comprehensive CSV mission report from analysis results."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header metadata
    writer.writerow(["# SonarSentinel Mission Detection Report"])
    writer.writerow(["# Mission ID", analysis.mission_id])
    writer.writerow(["# Timestamp", analysis.timestamp])
    writer.writerow(["# Pipeline Mode", analysis.mode])
    writer.writerow(["# Model Name", analysis.model_name])
    writer.writerow(["# Vessel Lat", analysis.navigation.vessel_lat])
    writer.writerow(["# Vessel Lon", analysis.navigation.vessel_lon])
    writer.writerow(["# Heading (deg)", analysis.navigation.heading])
    writer.writerow(["# Towfish Altitude (m)", analysis.navigation.altitude])
    writer.writerow(["# Total Targets", len(analysis.detections)])
    writer.writerow([])
    
    # Table headers
    writer.writerow([
        "Detection ID",
        "Target Class",
        "Hazard Level",
        "Final Hazard Score",
        "YOLO Model Confidence",
        "Acoustic Physics Score",
        "Acoustic Shadow Detected",
        "Estimated Latitude (WGS84)",
        "Estimated Longitude (WGS84)",
        "Cross-Track Offset (m)",
        "Along-Track Offset (m)",
        "Slant Range (m)",
        "Ground Range (m)",
        "BBox X1",
        "BBox Y1",
        "BBox X2",
        "BBox Y2",
        "Acoustic Notes"
    ])
    
    for det in analysis.detections:
        writer.writerow([
            det.id,
            det.class_name,
            det.hazard_level,
            f"{det.final_score:.2f}",
            f"{det.model_confidence:.2f}",
            f"{det.acoustic_score:.2f}",
            "YES" if det.shadow_detected else "NO",
            f"{det.latitude:.6f}",
            f"{det.longitude:.6f}",
            f"{det.geo_details.cross_track_m:.2f}",
            f"{det.geo_details.along_track_m:.2f}",
            f"{det.geo_details.slant_range_m:.2f}",
            f"{det.geo_details.ground_range_m:.2f}",
            int(det.bbox.x1),
            int(det.bbox.y1),
            int(det.bbox.x2),
            int(det.bbox.y2),
            det.physics_details.heuristic_notes
        ])
        
    return output.getvalue()

def export_report_geojson(analysis: AnalysisResponse) -> dict:
    """Generates standard WGS84 GeoJSON FeatureCollection for GIS/Maritime mapping."""
    features = []
    
    # Vessel feature
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [analysis.navigation.vessel_lon, analysis.navigation.vessel_lat]
        },
        "properties": {
            "name": "Survey Vessel / Towfish Position",
            "type": "vessel",
            "heading": analysis.navigation.heading,
            "altitude_m": analysis.navigation.altitude,
            "mission_id": analysis.mission_id
        }
    })
    
    # Detections
    for det in analysis.detections:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [det.longitude, det.latitude]
            },
            "properties": {
                "id": det.id,
                "class": det.class_name,
                "hazard_level": det.hazard_level,
                "final_score": det.final_score,
                "confidence": det.model_confidence,
                "acoustic_score": det.acoustic_score,
                "shadow_detected": det.shadow_detected,
                "slant_range_m": det.geo_details.slant_range_m,
                "cross_track_m": det.geo_details.cross_track_m
            }
        })
        
    return {
        "type": "FeatureCollection",
        "name": f"SonarSentinel_{analysis.mission_id}",
        "features": features
    }
