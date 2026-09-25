import cv2
import numpy as np
from app.config import settings
from app.models.schemas import BoundingBox, AcousticPhysicsDetails

def analyze_acoustic_physics(
    image_gray: np.ndarray,
    bbox: BoundingBox,
    sonar_type: str = "sidescan",
    look_direction: str = "auto"
) -> tuple[AcousticPhysicsDetails, float, str]:
    """
    Physics-Informed Acoustic Filter (Prototype Heuristic):
    
    Acoustic Principle:
    In active acoustic imaging (Side-Scan Sonar / Forward-Looking Sonar), sound pulses 
    reflect off elevated seabed obstacles, creating a high-backscatter highlight on the 
    insonified face, followed by an acoustic shadow (acoustic occlusion zone) behind 
    the target along the propagation ray.
    
    This function analyzes:
    1. Highlight intensity inside the bounding box.
    2. Shadow search zone along the sonar look vector.
    3. Highlight-to-shadow contrast ratio.
    4. Shadow darkness relative to local seabed background.
    5. Produces a normalized acoustic score [0.0 - 1.0] and combined hazard rating.
    """
    h, w = image_gray.shape
    x1 = max(0, min(int(bbox.x1), w - 1))
    y1 = max(0, min(int(bbox.y1), h - 1))
    x2 = max(x1 + 1, min(int(bbox.x2), w))
    y2 = max(y1 + 1, min(int(bbox.y2), h))
    
    box_w = x2 - x1
    box_h = y2 - y1
    
    # 1. Highlight Analysis (Inside Bounding Box)
    highlight_roi = image_gray[y1:y2, x1:x2]
    if highlight_roi.size == 0:
        highlight_mean = 128.0
        highlight_max = 128.0
    else:
        highlight_mean = float(np.mean(highlight_roi))
        highlight_max = float(np.max(highlight_roi))

    # 2. Determine Acoustic Propagation Direction
    # For Side-Scan Sonar, nadir is at w/2.
    # Targets on starboard (x > w/2) cast shadows to the right (+X).
    # Targets on port (x < w/2) cast shadows to the left (-X).
    target_center_x = (x1 + x2) / 2.0
    target_center_y = (y1 + y2) / 2.0
    
    search_dist = min(settings.SHADOW_SEARCH_DISTANCE_PX, max(int(box_w * 1.5), 30))
    
    if sonar_type == "sidescan":
        if look_direction == "auto":
            direction = "starboard" if target_center_x >= (w / 2.0) else "port"
        else:
            direction = look_direction
            
        if direction == "starboard":
            # Shadow is to the right of bounding box
            sx1 = x2
            sx2 = min(w, x2 + search_dist)
            sy1 = max(0, y1 - 4)
            sy2 = min(h, y2 + 4)
        else: # port
            # Shadow is to the left of bounding box
            sx1 = max(0, x1 - search_dist)
            sx2 = x1
            sy1 = max(0, y1 - 4)
            sy2 = min(h, y2 + 4)
    else:
        # Forward Looking Sonar: propagation is top to bottom (+Y)
        direction = "forward"
        sx1 = max(0, x1 - 4)
        sx2 = min(w, x2 + 4)
        sy1 = y2
        sy2 = min(h, y2 + search_dist)

    # 3. Extract Shadow Search ROI
    if sx2 > sx1 and sy2 > sy1:
        shadow_roi = image_gray[sy1:sy2, sx1:sx2]
        shadow_mean = float(np.mean(shadow_roi))
        shadow_min = float(np.min(shadow_roi))
        shadow_length = float(sx2 - sx1) if sonar_type == "sidescan" else float(sy2 - sy1)
    else:
        shadow_mean = highlight_mean * 0.9
        shadow_min = shadow_mean
        shadow_length = 0.0

    # 4. Extract Local Seafloor Background Reference (Annular Region)
    bg_pad_x = min(40, int(box_w * 0.8))
    bg_pad_y = min(40, int(box_h * 0.8))
    bg_x1 = max(0, x1 - bg_pad_x)
    bg_y1 = max(0, y1 - bg_pad_y)
    bg_x2 = min(w, x2 + bg_pad_x)
    bg_y2 = min(h, y2 + bg_pad_y)
    
    bg_region = image_gray[bg_y1:bg_y2, bg_x1:bg_x2]
    bg_mean = float(np.mean(bg_region)) if bg_region.size > 0 else 100.0

    # 5. Physics Heuristic Computation
    contrast_ratio = highlight_mean / max(shadow_mean, 1.0)
    
    # Shadow Darkness Check: Shadow should be substantially darker than local background
    shadow_drop = max(0.0, bg_mean - shadow_mean)
    shadow_darkness_score = min(1.0, shadow_drop / max(bg_mean * 0.4, 1.0))
    
    # Highlight Brightness Check: Highlight should be brighter than local background
    highlight_elevation = max(0.0, highlight_mean - bg_mean)
    highlight_brightness_score = min(1.0, highlight_elevation / max(bg_mean * 0.3, 1.0))
    
    # Contrast metric
    contrast_score = min(1.0, (contrast_ratio - 1.0) / 1.5) if contrast_ratio > 1.0 else 0.0

    # Shadow Detected Boolean condition
    shadow_detected = (contrast_ratio >= 1.30) or (shadow_mean < bg_mean * 0.82)
    
    # Weighted prototype heuristic score
    raw_acoustic_score = (
        0.45 * contrast_score +
        0.35 * shadow_darkness_score +
        0.20 * highlight_brightness_score
    )
    
    # Ensure acoustic score is in [0.05, 0.98] range
    if shadow_detected:
        acoustic_score = float(np.clip(raw_acoustic_score, 0.60, 0.96))
        notes = f"Acoustic highlight (mean={highlight_mean:.1f}) coupled with valid acoustic shadow (mean={shadow_mean:.1f}, contrast={contrast_ratio:.2f}x) in {direction} look direction."
    else:
        acoustic_score = float(np.clip(raw_acoustic_score, 0.15, 0.58))
        notes = f"Weak shadow signature in {direction} look sector (contrast={contrast_ratio:.2f}x). Possible low-profile or seabed artifact."

    physics_details = AcousticPhysicsDetails(
        shadow_detected=shadow_detected,
        highlight_mean_intensity=round(highlight_mean, 1),
        shadow_mean_intensity=round(shadow_mean, 1),
        contrast_ratio=round(contrast_ratio, 2),
        shadow_length_px=round(shadow_length, 1),
        acoustic_score=round(acoustic_score, 2),
        heuristic_notes=notes
    )

    return physics_details, acoustic_score, notes

def calculate_hazard_level(final_score: float, class_name: str) -> str:
    """Classifies detection severity into transparent thresholds."""
    # Critical hazard weighting for dangerous maritime obstacles
    high_threat_classes = ["ghost_net", "wreckage"]
    
    if final_score >= settings.THRESHOLD_CRITICAL or (class_name in high_threat_classes and final_score >= 0.72):
        return "CRITICAL"
    elif final_score >= settings.THRESHOLD_HIGH or (class_name in high_threat_classes and final_score >= 0.58):
        return "HIGH"
    elif final_score >= settings.THRESHOLD_MEDIUM:
        return "MEDIUM"
    else:
        return "LOW"
