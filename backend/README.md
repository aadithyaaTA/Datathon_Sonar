# SonarSentinel Backend (FastAPI + OpenCV + YOLO)

This is the core ML and telemetry processing backend for **SonarSentinel** (MoES SIH26057).

## Architecture Highlights
- **FastAPI** asynchronous REST API with Swagger documentation at `/docs`
- **Image Preprocessing**: Bilateral speckle filter and CLAHE contrast enhancement
- **Detector Manager**:
  - `AI Mode`: Loads custom YOLOv8 weights from `models/sonarsentinel.pt`
  - `DEMO Mode`: Runs high-fidelity acoustic feature extraction and realistic anomaly proposals for offline hackathon presentations
- **Physics-Informed Acoustic Filter**: Shadow search ray tracing and contrast ratio computation
- **Sonar Geolocation Engine**: Translates pixel offsets and towfish telemetry to WGS84 coordinates
- **Report Generation**: Exports mission data in JSON, CSV, and GeoJSON formats

## Quick Run
```powershell
# In root or backend folder
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
