# SonarSentinel — Automated Underwater Debris & Anomaly Detection

[![Smart India Hackathon](https://img.shields.io/badge/SIH-2024%2F2025-blue.svg)](https://sih.gov.in)
[![Ministry of Earth Sciences](https://img.shields.io/badge/MoES-SIH26057-emerald.svg)](https://moes.gov.in)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%7C%20OpenCV%20%7C%20PyTorch-00e5ff.svg)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Vite%20%7C%20Leaflet-00f59b.svg)]()

> **Problem Statement:** SIH26057 — Ministry of Earth Sciences (MoES)  
> **Topic:** Automated Underwater Debris, Ghost Net & Acoustic Anomaly Detection using Side-Scan Sonar (SSS) and Forward-Looking Sonar (FLS) imagery with Physics-Informed Verification and WGS84 Georeferencing.

---

## 🌊 System Architecture Overview

```
Sonar Image
     ↓
Image Ingestion & Telemetry (Lat, Lon, Heading, Altitude)
     ↓
Preprocessing (Bilateral Noise Despeckling + CLAHE Contrast Amplification)
     ↓
YOLOv8-Nano Feature Proposal Engine (Ghost Net, Cylinder, Pipe, Wreckage, Anomaly)
     ↓
Physics-Informed Acoustic Filter (Highlight + Look-Direction Shadow Analysis)
     ↓
Multi-Factor Hazard Scoring (0.65 × YOLO + 0.35 × Acoustic Physics)
     ↓
WGS84 Geolocation Engine (Cross-track Ground Range + Heading Rotation Matrix)
     ↓
Interactive Maritime GIS Dashboard (Leaflet + Sonar Swath Inspector)
     ↓
Hydrographic Mission Report Export (JSON, CSV, GeoJSON)
```

---

## 🚀 Quick Start (Windows / VS Code)

### Option 1: One-Click Launch (Recommended)
Double click `run.bat` or run:
```powershell
.\run.bat
```
This script will automatically:
1. Create and activate `.venv`
2. Install Python dependencies
3. Install frontend Node modules
4. Launch the FastAPI backend on `http://localhost:8000`
5. Launch the React frontend on `http://localhost:5173`
6. Open your default web browser

---

### Option 2: Manual Terminal Execution

#### Terminal 1 — Backend:
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Terminal 2 — Frontend:
```powershell
cd frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 🧭 Live Demonstration Flow for Hackathon Evaluators

1. **Launch SonarSentinel**: Observe the Tactical HUD displaying `SYSTEM STATUS: ONLINE` and `MODE: DEMO` (or `AI` if PyTorch weights are loaded).
2. **Select a Quick-Demo Scenario**: Click any scenario from the top banner:
   - *Bay of Bengal — Entangled Ghost Net Survey (Chennai Coast)*
   - *Palk Strait — Submerged Wooden Wreckage (Channel Obstacle)*
   - *Arabian Sea — Subsea Pipeline Exposure (Mumbai Offshore)*
   - *Visakhapatnam Port — Cylindrical Anomaly (Approach Sweeps)*
3. **Inspect Ingested Telemetry**: Note the dynamic GPS coordinates, compass heading, towfish altitude, and acoustic swath width.
4. **Execute Sonar Analysis**: Click **RUN SONAR ANALYSIS**.
5. **Inspect Acoustic Results**:
   - Switch between **AI Detections**, **CLAHE Enhanced**, and **Raw Sonar** viewports.
   - Inspect the **Physics-Informed Acoustic Filter** card: view highlight peak, shadow base, contrast ratio, and confirmed acoustic occlusion zone.
   - Observe the **Multi-Score Hazard Breakdown**: model confidence, acoustic physics score, and blended severity index ($0.65 \times \text{AI} + 0.35 \times \text{Physics}$).
6. **Maritime GIS Georeferencing**: Look at the interactive Leaflet map to see the survey towfish orientation and georeferenced anomaly locations on the WGS84 coordinate grid.
7. **Download Mission Intelligence Reports**: Click **MISSION REPORT** to export standardized **JSON**, **CSV**, and **GeoJSON** data.

---

## 📁 Repository Structure

```
sonarsentinel/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint, CORS & static mounting
│   │   ├── config.py                # App configuration, weights & hazard thresholds
│   │   ├── api/
│   │   │   ├── routes_health.py     # System & hardware status check
│   │   │   ├── routes_analysis.py   # Sonar analysis & annotation pipeline
│   │   │   ├── routes_reports.py    # JSON, CSV & GeoJSON export endpoints
│   │   │   └── routes_samples.py    # Preset scenario catalog
│   │   ├── services/
│   │   │   ├── preprocessing.py     # Bilateral despeckling + CLAHE enhancement
│   │   │   ├── detector.py          # YOLOv8 PyTorch / Demo fallback manager
│   │   │   ├── acoustic_filter.py   # Physics-informed shadow ray-tracing & contrast
│   │   │   ├── geolocation.py       # Slant-to-ground range & WGS84 projection
│   │   │   ├── reporting.py         # Formatted CSV/JSON/GeoJSON report builders
│   │   │   └── sample_generator.py  # High-fidelity synthetic SSS generator
│   │   └── models/
│   │       └── schemas.py           # Pydantic data schemas
│   ├── models/
│   │   └── sonarsentinel.pt         # Optional custom-trained YOLO weights
│   ├── data/
│   │   ├── uploads/                 # Storage for processed missions
│   │   └── samples/                 # Pre-generated sonar benchmark imagery
│   └── requirements.txt             # Python backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # HUD navigation bar & system status
│   │   │   ├── MetricCards.jsx      # KPI summary cards
│   │   │   ├── PresetSelector.jsx   # 1-Click hackathon demo scenarios
│   │   │   ├── TelemetryControl.jsx # Ingestion form & navigation parameters
│   │   │   ├── SonarViewer.jsx      # Multi-mode acoustic viewport (Raw/CLAHE/AI)
│   │   │   ├── DetectionInspector.jsx # Physics metrics & score breakdown
│   │   │   ├── MaritimeMap.jsx      # Leaflet GIS map with vessel & target markers
│   │   │   └── ReportModal.jsx      # Mission intelligence export dialog
│   │   ├── services/
│   │   │   └── api.js               # Axios API client
│   │   ├── App.jsx                  # Main command center layout
│   │   ├── main.jsx                 # React root mounting
│   │   └── index.css                # Marine theme Tailwind styles
│   └── package.json
│
├── docs/
│   └── ARCHITECTURE.md              # Mathematical & theoretical derivation
├── run.bat                          # One-click Windows runner
├── start_backend.bat                # Standalone backend launcher
├── start_frontend.bat               # Standalone frontend launcher
└── .gitignore
```

---

## 🔬 Scientific & Technical Highlights

1. **Bilateral Despeckling**: Unlike Gaussian blur, Bilateral filtering smooths multiplicative acoustic Rayleigh speckle while strictly preserving the sharp boundaries of acoustic highlights and occlusion shadows.
2. **CLAHE (Contrast Limited Adaptive Histogram Equalization)**: Overcomes severe acoustic attenuation and non-uniform acoustic beam patterns across the swath width.
3. **Physics-Informed Verification**: Evaluates the physical validity of detections by searching for correlated acoustic shadows in the direction of acoustic propagation, eliminating false positives caused by surface noise.
4. **WGS84 Sonar Swath Trigonometry**: Converts pixel cross-track distances to metric ground ranges using towfish altitude and applies vessel heading rotation matrices to project targets onto standard global navigation charts.

---

## 🛠️ Developed for Smart India Hackathon
Ministry of Earth Sciences (MoES) — Problem Statement SIH26057
