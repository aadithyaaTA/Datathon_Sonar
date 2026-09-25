import cv2
import numpy as np
from PIL import Image
import io
from pathlib import Path
import base64

def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Decodes raw image bytes into a BGR/Grayscale OpenCV numpy array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("Could not decode image bytes into a valid image.")
    return image

def preprocess_sonar_image(
    image: np.ndarray,
    clahe_clip_limit: float = 2.5,
    clahe_grid_size: tuple = (8, 8),
    bilateral_d: int = 7,
    bilateral_sigma_color: float = 50.0,
    bilateral_sigma_space: float = 50.0
) -> dict:
    """
    Standardized Sonar Image Preprocessing Pipeline:
    1. Grayscale Conversion (preserves luminance)
    2. Bilateral Filtering: Removes high-frequency speckle noise while preserving sharp acoustic shadow and target boundaries.
    3. CLAHE (Contrast Limited Adaptive Histogram Equalization): Amplifies faint acoustic returns without over-amplifying background noise.
    4. Normalization to [0, 255] uint8.
    
    Returns:
        dict containing:
            - 'original': Original image (uint8)
            - 'processed': Preprocessed enhanced single-channel image (uint8)
            - 'processed_bgr': 3-channel version ready for YOLO inference
            - 'height': Image height in pixels
            - 'width': Image width in pixels
    """
    # 1. Grayscale handling
    if len(image.shape) == 3:
        if image.shape[2] == 4: # RGBA
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        orig_bgr = image
    else:
        gray = image.copy()
        orig_bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)

    h, w = gray.shape

    # 2. Despeckling via Bilateral Filter
    # Bilateral filter is ideal for acoustic sonar because it considers both spatial distance and radiometric difference.
    despeckled = cv2.bilateralFilter(
        gray,
        d=bilateral_d,
        sigmaColor=bilateral_sigma_color,
        sigmaSpace=bilateral_sigma_space
    )

    # 3. CLAHE Contrast Enhancement
    clahe = cv2.createCLAHE(clipLimit=clahe_clip_limit, tileGridSize=clahe_grid_size)
    enhanced = clahe.apply(despeckled)

    # 4. Normalization
    normalized = cv2.normalize(enhanced, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)

    # 3-channel output for YOLO architectures
    processed_bgr = cv2.cvtColor(normalized, cv2.COLOR_GRAY2BGR)

    return {
        "original": orig_bgr,
        "gray": gray,
        "processed": normalized,
        "processed_bgr": processed_bgr,
        "height": h,
        "width": w
    }

def save_image_to_disk(image: np.ndarray, output_path: Path) -> str:
    """Saves an image to disk and returns the relative or absolute filepath."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), image)
    return str(output_path)

def encode_image_to_base64(image: np.ndarray, format: str = ".jpg") -> str:
    """Encodes a numpy image into a Base64 Data URL string."""
    success, buffer = cv2.imencode(format, image)
    if not success:
        return ""
    b64_str = base64.b64encode(buffer).decode("utf-8")
    mime = "image/jpeg" if format.lower() in [".jpg", ".jpeg"] else "image/png"
    return f"data:{mime};base64,{b64_str}"
