import pytest
import numpy as np
from app.models.schemas import BoundingBox, NavigationMetadata
from app.services.preprocessing import preprocess_sonar_image
from app.services.acoustic_filter import analyze_acoustic_physics, calculate_hazard_level
from app.services.geolocation import estimate_wgs84_coordinates
from app.services.detector import DemoDetector

def test_preprocessing():
    # Synthetic test image
    raw = np.random.randint(0, 255, (200, 300, 3), dtype=np.uint8)
    res = preprocess_sonar_image(raw)
    assert "processed" in res
    assert "processed_bgr" in res
    assert res["height"] == 200
    assert res["width"] == 300
    assert res["processed"].shape == (200, 300)

def test_acoustic_filter():
    # Test highlight with adjacent dark shadow
    img = np.ones((200, 400), dtype=np.uint8) * 100
    # Highlight at x=250-280 (starboard)
    img[80:120, 250:280] = 240
    # Shadow at x=280-340
    img[80:120, 280:340] = 15
    
    bbox = BoundingBox(x1=250, y1=80, x2=280, y2=120)
    details, score, notes = analyze_acoustic_physics(img, bbox, sonar_type="sidescan", look_direction="starboard")
    
    assert details.shadow_detected is True
    assert details.contrast_ratio > 2.0
    assert score > 0.60

def test_geolocation():
    nav = NavigationMetadata(
        vessel_lat=13.0827,
        vessel_lon=80.2707,
        heading=90.0,  # Eastward heading
        altitude=15.0,
        swath_width_m=100.0
    )
    # Target on starboard side (right of nadir)
    bbox = BoundingBox(x1=500, y1=200, x2=550, y2=250)
    geo = estimate_wgs84_coordinates(bbox, image_width=800, image_height=400, nav=nav)
    
    # Check that coordinate changes exist and are within reasonable marine survey range
    assert abs(geo.latitude - 13.0827) < 0.01
    assert abs(geo.longitude - 80.2707) < 0.01
    assert geo.cross_track_m > 0
    assert geo.slant_range_m >= 15.0

def test_hazard_classification():
    assert calculate_hazard_level(0.85, "ghost_net") == "CRITICAL"
    assert calculate_hazard_level(0.70, "unknown_anomaly") == "HIGH"
    assert calculate_hazard_level(0.50, "pipe") == "MEDIUM"
    assert calculate_hazard_level(0.30, "pipe") == "LOW"

def test_demo_detector():
    img = np.zeros((400, 600), dtype=np.uint8)
    # Draw high contrast patch
    img[150:200, 350:420] = 230
    det = DemoDetector()
    results = det.detect(img)
    assert len(results) > 0
    assert "class_name" in results[0]
    assert "confidence" in results[0]
