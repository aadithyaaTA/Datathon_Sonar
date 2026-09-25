import cv2
import numpy as np
from pathlib import Path
from app.config import settings

def create_synthetic_seafloor(width: int = 800, height: int = 500) -> np.ndarray:
    """
    Generates realistic Side Scan Sonar (SSS) seafloor texture:
    - Rayleigh-distributed acoustic reverberation speckle
    - Dark central water column (nadir blind zone)
    - Gentle seabed ripple patterns
    """
    # 1. Base acoustic backscatter with speckle (Rayleigh-like distribution)
    noise = np.random.rayleigh(scale=35.0, size=(height, width)).astype(np.float32)
    base_seafloor = np.clip(noise + 55.0, 0, 255).astype(np.uint8)
    
    # 2. Add subtle sand ripple bands
    x = np.linspace(0, 15 * np.pi, width)
    y = np.linspace(0, 8 * np.pi, height)
    xx, yy = np.meshgrid(x, y)
    ripples = (np.sin(xx + np.sin(yy * 0.4)) * 14.0).astype(np.float32)
    seafloor = np.clip(base_seafloor.astype(np.float32) + ripples, 0, 255).astype(np.uint8)
    
    # 3. Simulate central nadir water column (Towfish altitude blind zone)
    nadir_center = width // 2
    nadir_half_width = width // 24
    
    for i in range(width):
        dist_from_nadir = abs(i - nadir_center)
        if dist_from_nadir < nadir_half_width:
            # Dark water column
            attenuation = (dist_from_nadir / nadir_half_width) ** 1.8
            seafloor[:, i] = (seafloor[:, i] * (0.15 + 0.85 * attenuation)).astype(np.uint8)
        elif dist_from_nadir < nadir_half_width + 12:
            # First seabed bottom return peak (high reflectivity bright line at nadir edge)
            seafloor[:, i] = np.clip(seafloor[:, i].astype(np.float32) * 1.35, 0, 255).astype(np.uint8)
            
    return seafloor

def add_acoustic_target(
    sonar_img: np.ndarray,
    target_type: str,
    cx: int,
    cy: int,
    size_w: int = 40,
    size_h: int = 25
) -> np.ndarray:
    """
    Renders an acoustic target with authentic physics:
    - High reflectivity highlight on ensonified side
    - Acoustic shadow cast away from the central nadir track
    """
    img = sonar_img.copy()
    h, w = img.shape
    is_starboard = (cx >= w // 2)
    shadow_dir = 1 if is_starboard else -1
    shadow_length = int(size_w * 2.2)

    # 1. Cast Acoustic Shadow (Occlusion behind object)
    if shadow_dir == 1:
        sx1 = min(w, cx + size_w // 2)
        sx2 = min(w, sx1 + shadow_length)
    else:
        sx2 = max(0, cx - size_w // 2)
        sx1 = max(0, sx2 - shadow_length)

    sy1 = max(0, cy - size_h // 2 - 2)
    sy2 = min(h, cy + size_h // 2 + 2)

    if sx2 > sx1 and sy2 > sy1:
        # Shadow region has near zero acoustic return
        shadow_mask = np.ones((sy2 - sy1, sx2 - sx1), dtype=np.float32) * 0.15
        img[sy1:sy2, sx1:sx2] = (img[sy1:sy2, sx1:sx2].astype(np.float32) * shadow_mask).astype(np.uint8)

    # 2. Draw Acoustic Highlight based on target geometry
    hx1 = max(0, cx - size_w // 2)
    hy1 = max(0, cy - size_h // 2)
    hx2 = min(w, cx + size_w // 2)
    hy2 = min(h, cy + size_h // 2)

    if target_type == "ghost_net":
        # Entangled mesh texture with bright knot highlights
        for _ in range(35):
            rx = np.random.randint(hx1, hx2)
            ry = np.random.randint(hy1, hy2)
            cv2.circle(img, (rx, ry), np.random.randint(2, 5), int(np.random.randint(210, 255)), -1)
        # Webbing strands
        cv2.line(img, (hx1, hy1), (hx2, hy2), 220, 2)
        cv2.line(img, (hx1, hy2), (hx2, hy1), 210, 2)
        
    elif target_type == "wreckage":
        # Angular ship hull frame with strong metallic acoustic reflection
        pts = np.array([
            [hx1 + 5, hy1 + size_h // 2],
            [hx1 + size_w // 3, hy1],
            [hx2, hy1 + 4],
            [hx2 - 8, hy2],
            [hx1 + size_w // 4, hy2 - 2]
        ], np.int32)
        cv2.fillPoly(img, [pts], 245)
        cv2.polylines(img, [pts], True, 255, 2)
        
    elif target_type == "pipe":
        # Long cylindrical pipeline traversing across swath
        cv2.rectangle(img, (hx1, hy1), (hx2, hy2), 240, -1)
        cv2.line(img, (hx1, hy1), (hx2, hy1), 255, 2)
        
    elif target_type == "cylinder":
        # Cylindrical canister or unexploded ordnance
        cv2.ellipse(img, (cx, cy), (size_w // 2, size_h // 2), 15, 0, 360, 250, -1)
        
    else: # unknown_anomaly
        # Irregular geological or synthetic boulder/debris
        pts = np.random.randint(-size_w//2, size_w//2, size=(6, 2)) + [cx, cy]
        cv2.fillPoly(img, [pts.astype(np.int32)], 235)

    return img

def generate_sample_dataset() -> list[dict]:
    """
    Generates realistic sample sonar survey images for instant hackathon demonstration.
    Returns list of metadata presets.
    """
    samples_dir = settings.SAMPLES_DIR
    samples_dir.mkdir(parents=True, exist_ok=True)
    
    presets = [
        {
            "id": "sample-ghostnet-01",
            "name": "Bay of Bengal — Entangled Ghost Net Survey",
            "description": "Side-scan sonar record from MoES coastal survey showing discarded monofilament ghost net posing serious navigational and marine hazard.",
            "filename": "sample_ghost_net.png",
            "target_type": "ghost_net",
            "target_pos": (540, 220),
            "size": (60, 45),
            "nav": {
                "vessel_lat": 13.0827,
                "vessel_lon": 80.2707,
                "heading": 85.0,
                "altitude": 18.0,
                "swath_width_m": 100.0,
                "survey_speed_knots": 3.8,
                "mission_name": "MoES-Chennai-Transect-04"
            }
        },
        {
            "id": "sample-shipwreck-02",
            "name": "Palk Strait — Submerged Wooden Wreckage",
            "description": "High-backscatter angular hull structure identified in shallow navigation channel with extensive acoustic shadow.",
            "filename": "sample_shipwreck.png",
            "target_type": "wreckage",
            "target_pos": (240, 280),
            "size": (85, 48),
            "nav": {
                "vessel_lat": 9.2876,
                "vessel_lon": 79.3129,
                "heading": 135.0,
                "altitude": 14.0,
                "swath_width_m": 120.0,
                "survey_speed_knots": 4.2,
                "mission_name": "PalkStrait-Debris-Audit"
            }
        },
        {
            "id": "sample-pipeline-03",
            "name": "Arabian Sea — Subsea Pipeline Exposure",
            "description": "Exposed underwater pipeline infrastructure showing continuous acoustic highlight and shadow signature.",
            "filename": "sample_pipeline.png",
            "target_type": "pipe",
            "target_pos": (560, 260),
            "size": (140, 22),
            "nav": {
                "vessel_lat": 18.9220,
                "vessel_lon": 72.8347,
                "heading": 210.0,
                "altitude": 22.0,
                "swath_width_m": 150.0,
                "survey_speed_knots": 4.0,
                "mission_name": "MumbaiHigh-Pipeline-Survey"
            }
        },
        {
            "id": "sample-cylinder-04",
            "name": "Visakhapatnam Port — Cylindrical Anomaly",
            "description": "Compact acoustic reflector with high shadow contrast in port approach shipping corridor.",
            "filename": "sample_cylinder.png",
            "target_type": "cylinder",
            "target_pos": (280, 180),
            "size": (35, 30),
            "nav": {
                "vessel_lat": 17.6868,
                "vessel_lon": 83.2185,
                "heading": 45.0,
                "altitude": 16.0,
                "swath_width_m": 90.0,
                "survey_speed_knots": 3.5,
                "mission_name": "VizagPort-Security-Sweep"
            }
        }
    ]

    for p in presets:
        target_path = samples_dir / p["filename"]
        if not target_path.exists():
            base = create_synthetic_seafloor(width=800, height=500)
            tx, ty = p["target_pos"]
            tw, th = p["size"]
            final_img = add_acoustic_target(base, p["target_type"], tx, ty, tw, th)
            cv2.imwrite(str(target_path), final_img)
            
    return presets
