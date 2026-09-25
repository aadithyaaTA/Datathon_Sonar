import io
import pytest
from fastapi.testclient import TestClient
import numpy as np
import cv2

from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert data["mode"] in ["DEMO", "AI"]
    assert "ghost_net" in data["classes"]

def test_samples_endpoint():
    response = client.get("/api/samples")
    assert response.status_code == 200
    presets = response.json()
    assert len(presets) >= 4
    assert presets[0]["filename"].endswith(".png")

def test_analyze_and_report_pipeline():
    # Generate synthetic image bytes
    img = np.random.randint(40, 200, (400, 600), dtype=np.uint8)
    # Add bright patch and dark shadow
    img[120:160, 380:420] = 245
    img[120:160, 420:470] = 20
    _, buffer = cv2.imencode(".png", img)
    
    files = {
        "file": ("test_sonar.png", io.BytesIO(buffer.tobytes()), "image/png")
    }
    data = {
        "vessel_lat": "13.0827",
        "vessel_lon": "80.2707",
        "heading": "90.0",
        "altitude": "15.0",
        "swath_width_m": "100.0",
        "mission_name": "Integration-Test-Transect"
    }

    res = client.post("/api/analyze", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    
    assert "mission_id" in res_data
    assert "detections" in res_data
    assert len(res_data["detections"]) > 0
    assert "annotated_image_url" in res_data
    assert "preprocessed_image_url" in res_data
    
    mission_id = res_data["mission_id"]

    # Test report export
    json_rep = client.get(f"/api/report/{mission_id}/json")
    assert json_rep.status_code == 200
    assert "mission_id" in json_rep.text

    csv_rep = client.get(f"/api/report/{mission_id}/csv")
    assert csv_rep.status_code == 200
    assert "Detection ID" in csv_rep.text
    assert "Acoustic Physics Score" in csv_rep.text

    geojson_rep = client.get(f"/api/report/{mission_id}/geojson")
    assert geojson_rep.status_code == 200
    geojson_data = geojson_rep.json()
    assert geojson_data["type"] == "FeatureCollection"
