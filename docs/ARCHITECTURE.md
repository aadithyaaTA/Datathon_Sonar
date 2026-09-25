# SonarSentinel — System Architecture & Theoretical Framework

**Project Problem Statement:** SIH26057 — Ministry of Earth Sciences (MoES)  
**Track:** Marine & Deep Sea Technology / Autonomous Ocean Floor Intelligence

---

## 1. End-to-End Processing Pipeline

```
┌───────────────────────────────────────────────────────────┐
│              Raw Sonar Ingestion (SSS / FLS)              │
│       (8-bit / 16-bit GeoTIFF, PNG, JPG, or Slant Array)  │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│               Acoustic Image Preprocessing                │
│  • Grayscale Luminance Conversion                         │
│  • Bilateral Despeckling Filter (Edge-Preserving Noise)   │
│  • Contrast Limited Adaptive Histogram Equalization       │
│    (CLAHE) for Low-Backscatter Contrast Amplification    │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│               YOLOv8-Nano / Feature Detector              │
│  • Lightweight Subsea Object Detection Model              │
│  • Bounding Box Extraction & Class Identification:        │
│    - ghost_net, cylinder, pipe, wreckage, unknown_anomaly │
│  • High-Recall Target Candidate Proposal                  │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│        Physics-Informed Acoustic Verification Filter      │
│  • Highlight-to-Shadow Spatial Geometry Analysis          │
│  • Look-Direction Sonar Ray Tracing (Port / Starboard)    │
│  • Occlusion Zone Darkness & Contrast Gradient            │
│  • Physics Score = f(Contrast, Darkness, Highlight)       │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│         Multi-Criteria Hazard Fusion Scoring Engine       │
│  • Blended Score: 0.65 × YOLO_Conf + 0.35 × Acoustic_Phys │
│  • Transparent Classification Thresholds:                 │
│    - CRITICAL (>= 0.80) | HIGH (>= 0.65)                  │
│    - MEDIUM (>= 0.45)   | LOW (< 0.45)                    │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│       WGS84 Sonar Georeferencing & Navigation Engine      │
│  • Slant-Range to Ground-Range Trigonometric Projection   │
│  • Cross-track / Along-track Metric Offsets               │
│  • Vessel Heading (ψ) Rotation Matrix                     │
│  • WGS84 Geodesic Destination Point Calculation           │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────┐
│        Command Dashboard & Hydrographic Report Export     │
│  • Tactical Marine GIS Leaflet Map (WGS84 Overlay)        │
│  • Dual-Swath Sonar Visualizer (Raw vs Enhanced vs AI)   │
│  • Automated Mission Export: JSON, CSV, GeoJSON           │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Physics-Informed Acoustic Filter Model

Unlike terrestrial camera images, Side-Scan Sonar (SSS) and Forward-Looking Sonar (FLS) operate via acoustic pressure waves radiated from an acoustic transducer at slant angles.

### Physical Phenomenon:
1. **Acoustic Highlight:** When sound strikes an elevated obstacle on the seabed, the incident energy reflects directly back to the receiver, forming a high-intensity backscatter region.
2. **Acoustic Shadow (Occlusion Zone):** Because sound travels in straight acoustic rays through the water column, the physical body of the obstacle prevents acoustic energy from reaching the seabed behind it, leaving a zero-energy acoustic shadow.
3. **Contrast Coupling:** Terrestrial false positives (e.g. digital sensor noise or seabed algae flat patches) do not generate correlated acoustic shadows.

### Formulaic Heuristic:
$$\text{Contrast Ratio} = \frac{\mu_{\text{highlight}}}{\max(\mu_{\text{shadow}}, 1.0)}$$

$$\text{Darkness Score} = \min\left(1.0, \frac{\max(0, \mu_{\text{bg}} - \mu_{\text{shadow}})}{0.4 \times \mu_{\text{bg}}}\right)$$

$$\text{Acoustic Physics Score} = 0.45 \cdot S_{\text{contrast}} + 0.35 \cdot S_{\text{darkness}} + 0.20 \cdot S_{\text{highlight}}$$

$$\text{Final Hazard Rating} = 0.65 \times \text{Confidence}_{\text{YOLO}} + 0.35 \times \text{Score}_{\text{Acoustic}}$$

---

## 3. Sonar Swath Georeferencing Geometry

Given:
- Towfish Vessel Position: $(\phi_v, \lambda_v)$
- Vessel Heading: $\psi$ (degrees True North)
- Towfish Altitude: $h$ (meters above seafloor)
- Swath Width: $W$ (meters)
- Sonar Pixel Width: $W_{px}$, Pixel Height: $H_{px}$
- Target BBox Center: $(x_c, y_c)$

### Metric Coordinate Conversion:
1. Pixel Scale: $S_x = \frac{W}{W_{px}}$
2. Cross-track offset from nadir:
   $$\Delta x = (x_c - \frac{W_{px}}{2}) \cdot S_x$$
3. Along-track offset:
   $$\Delta y = - (y_c - \frac{H_{px}}{2}) \cdot S_x$$
4. Slant Range:
   $$R_s = \sqrt{\Delta x^2 + h^2}$$
5. Transform to Navigation Frame:
   $$\Delta \text{North} = \Delta y \cos\psi - \Delta x \sin\psi$$
   $$\Delta \text{East} = \Delta y \sin\psi + \Delta x \cos\psi$$
6. WGS84 Forward Geodesic:
   $$\phi_{\text{target}} = \phi_v + \left(\frac{\Delta \text{North}}{R_E}\right) \times \frac{180}{\pi}$$
   $$\lambda_{\text{target}} = \lambda_v + \left(\frac{\Delta \text{East}}{R_E \cos\phi_v}\right) \times \frac{180}{\pi}$$
