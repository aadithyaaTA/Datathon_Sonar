# SonarSentinel Frontend (React + Vite + Leaflet + Tailwind)

A modern marine hydrographic command dashboard for underwater anomaly intelligence.

## Features
- **Live Sonar Viewer**: Switch between Raw Sonar, CLAHE Contrast Boost, and Tactical AI Overlay.
- **GIS Maritime Map**: Real-time Leaflet GIS mapping with WGS84 target markers and survey swath footprints.
- **Physics Inspector**: Visualizes highlight-to-shadow contrast ratio, shadow continuity, and confidence gauges.
- **Telemetry Ingestion**: Configurable vessel latitude, longitude, compass heading, and towfish altitude.
- **Mission Intelligence Reports**: One-click export to formatted JSON, CSV, and GIS GeoJSON.

## Quick Run
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.
