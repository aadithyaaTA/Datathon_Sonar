"""
SonarSentinel — Step 2: Model-Loading Service (inference.py)
=============================================================
Build Order Reference : SonarSentinel_Backend_Build_Order.txt  →  Step 2
Author block          : YOUR NAME / YOUR TEAM

WHAT THIS FILE DOES
-------------------
Loads the exported ONNX model ONCE at FastAPI startup using
onnxruntime.InferenceSession and exposes a single run(image) method
that returns:
    • raw bounding boxes  (pixel coordinates in original image space)
    • class labels        (ghost_net | cylinder | pipe | wreckage | unknown_anomaly)
    • confidence scores   (float 0.0 – 1.0)

INTEGRATION INTO main.py  (add these two snippets)
---------------------------------------------------
  # ── import ──
  from step2_model_loading.inference import onnx_session

  # ── inside lifespan() startup block ──
  logger.info(
      f"[Step 2] Session ready — mode={onnx_session.mode} | "
      f"loaded={onnx_session.is_loaded}"
  )

IMPORTANT NOTE ON MODEL FILE
-----------------------------
Place the exported ONNX weights at:
    backend/models/sonarsentinel.onnx

If the file is absent the DummyInferenceSession kicks in automatically
so every downstream step (3-8) can still be developed and tested.
Swap to the real session by dropping the .onnx file in place — no code
change needed.
"""

import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger("sonarsentinel.step2.inference")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
# Must match the ONNX model's training class order exactly.
TARGET_CLASSES: list[str] = [
    "ghost_net",
    "cylinder",
    "pipe",
    "wreckage",
    "unknown_anomaly",
]

# YOLOv8-nano default input resolution (change to match your export config).
MODEL_INPUT_H: int = 640
MODEL_INPUT_W: int = 640

# Absolute path to the ONNX weights file.
# Resolves to:  <repo_root>/backend/models/sonarsentinel.onnx
_MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
ONNX_MODEL_PATH: Path = _MODELS_DIR / "sonarsentinel.onnx"


# ===========================================================================
# OnnxInferenceSession
# ===========================================================================
class OnnxInferenceSession:
    """
    Wraps onnxruntime.InferenceSession for the SonarSentinel ONNX model.

    Load once, reuse forever — the singleton at the bottom of this file
    is built at import time so no session overhead is paid per-request.

    Public API
    ----------
    session.is_loaded  →  bool   True when the .onnx file was found & loaded.
    session.mode       →  str    "ONNX" or "DUMMY"
    session.run(image) →  tuple  (boxes, labels, scores)
    """

    def __init__(self, model_path: Path) -> None:
        self.model_path = model_path
        self._session = None          # onnxruntime.InferenceSession
        self._input_name: Optional[str] = None
        self._loaded: bool = False
        self._load_model()

    # ------------------------------------------------------------------
    # Private: load once at construction / import time
    # ------------------------------------------------------------------
    def _load_model(self) -> None:
        """Initialises the onnxruntime session. Called once on module import."""
        if not self.model_path.exists():
            logger.warning(
                f"[Step 2] ONNX weights not found at '{self.model_path}'. "
                "Falling back to DummyInferenceSession — no code change needed "
                "once the .onnx file is placed at that path."
            )
            self._loaded = False
            return

        try:
            import onnxruntime as ort

            # Prefer GPU if available; silently fall back to CPU.
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            self._session = ort.InferenceSession(
                str(self.model_path), providers=providers
            )
            self._input_name = self._session.get_inputs()[0].name
            self._loaded = True

            active_provider = self._session.get_providers()[0]
            logger.info(
                f"[Step 2] ONNX model loaded — path='{self.model_path}' "
                f"provider={active_provider}"
            )

        except ImportError:
            logger.error(
                "[Step 2] 'onnxruntime' is not installed. "
                "Run:  pip install -r step2_model_loading/requirements_step2.txt"
            )
            self._loaded = False

        except Exception as exc:
            logger.error(
                f"[Step 2] Failed to load ONNX model: {exc}", exc_info=True
            )
            self._loaded = False

    # ------------------------------------------------------------------
    # Properties
    # ------------------------------------------------------------------
    @property
    def is_loaded(self) -> bool:
        """True when the ONNX session is ready for inference."""
        return self._loaded

    @property
    def mode(self) -> str:
        """'ONNX' when weights are loaded, 'DUMMY' otherwise."""
        return "ONNX" if self._loaded else "DUMMY"

    # ------------------------------------------------------------------
    # Private: preprocessing — BGR image → ONNX input tensor
    # ------------------------------------------------------------------
    @staticmethod
    def _preprocess(image: np.ndarray) -> np.ndarray:
        """
        Converts a BGR uint8 image to the float32 NCHW tensor that
        YOLOv8-style ONNX models expect.

        Steps
        -----
        1. Resize to (MODEL_INPUT_H, MODEL_INPUT_W)  ← letterbox-free
        2. BGR → RGB channel swap
        3. HWC layout → CHW layout
        4. Normalise [0, 255] → [0.0, 1.0]
        5. Add batch dim  → shape (1, 3, H, W)  dtype float32
        """
        resized   = cv2.resize(image, (MODEL_INPUT_W, MODEL_INPUT_H),
                               interpolation=cv2.INTER_LINEAR)
        rgb       = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        chw       = np.transpose(rgb, (2, 0, 1))            # HWC → CHW
        normed    = chw.astype(np.float32) / 255.0          # [0, 1]
        tensor    = np.expand_dims(normed, axis=0)          # (1, 3, H, W)
        return tensor

    # ------------------------------------------------------------------
    # Private: postprocessing — raw ONNX output → structured detections
    # ------------------------------------------------------------------
    @staticmethod
    def _postprocess(
        raw_output: np.ndarray,
        orig_w: int,
        orig_h: int,
        conf_threshold: float,
    ) -> tuple[list[dict], list[str], list[float]]:
        """
        Decodes the YOLOv8 ONNX output tensor into bounding boxes.

        Expected output shape for SonarSentinel (5 classes):
            [1, 9, N]  →  4 box coords  +  5 class scores  per candidate

        Coordinates are in the model's 640×640 space and are scaled back
        to the original image resolution using scale_x / scale_y.

        Parameters
        ----------
        raw_output     : np.ndarray   First output from session.run()
        orig_w, orig_h : int          Original image dimensions in pixels
        conf_threshold : float        Minimum class score to keep a box

        Returns
        -------
        boxes  : list[dict]   Keys: x1 y1 x2 y2 width height  (float, pixels)
        labels : list[str]    Class name per kept detection
        scores : list[float]  Confidence score per kept detection
        """
        pred = raw_output[0]
        if pred.ndim == 3:          # shape (1, channels, N) → (channels, N)
            pred = pred[0]

        num_candidates = pred.shape[1]
        num_classes    = pred.shape[0] - 4     # first 4 rows: cx, cy, w, h

        scale_x = orig_w / MODEL_INPUT_W
        scale_y = orig_h / MODEL_INPUT_H

        boxes:  list[dict]  = []
        labels: list[str]   = []
        scores: list[float] = []

        for i in range(num_candidates):
            cx, cy, bw, bh = (float(pred[0, i]), float(pred[1, i]),
                              float(pred[2, i]), float(pred[3, i]))

            class_scores = pred[4:, i]
            class_id     = int(np.argmax(class_scores))
            confidence   = float(class_scores[class_id])

            if confidence < conf_threshold:
                continue

            # Centre-format → corner-format, scaled to original resolution
            x1 = max(0.0,       (cx - bw / 2) * scale_x)
            y1 = max(0.0,       (cy - bh / 2) * scale_y)
            x2 = min(float(orig_w), (cx + bw / 2) * scale_x)
            y2 = min(float(orig_h), (cy + bh / 2) * scale_y)

            class_name = (
                TARGET_CLASSES[class_id]
                if class_id < len(TARGET_CLASSES)
                else "unknown_anomaly"
            )

            boxes.append({
                "x1":    round(x1,       1),
                "y1":    round(y1,       1),
                "x2":    round(x2,       1),
                "y2":    round(y2,       1),
                "width": round(x2 - x1, 1),
                "height":round(y2 - y1, 1),
            })
            labels.append(class_name)
            scores.append(round(confidence, 3))

        return boxes, labels, scores

    # ------------------------------------------------------------------
    # Public: run() — the one method everything else calls
    # ------------------------------------------------------------------
    def run(
        self,
        image: np.ndarray,
        conf_threshold: float = 0.25,
    ) -> tuple[list[dict], list[str], list[float]]:
        """
        Run ONNX inference on a sonar image.

        Parameters
        ----------
        image          : np.ndarray   BGR uint8 image (preprocessed sonar frame)
        conf_threshold : float        Minimum confidence to keep a detection

        Returns
        -------
        boxes  : list[dict]   Raw bounding boxes in original image pixel space.
                              Keys: x1, y1, x2, y2, width, height (all floats).
        labels : list[str]    Class name for each detection.
        scores : list[float]  Raw ONNX confidence score per detection.

        Raises
        ------
        RuntimeError   If the ONNX session failed to load (check is_loaded first).
        """
        if not self._loaded or self._session is None:
            raise RuntimeError(
                "[Step 2] OnnxInferenceSession is not loaded. "
                "Check that 'sonarsentinel.onnx' exists at the configured path "
                "or use DummyInferenceSession for development."
            )

        orig_h, orig_w = image.shape[:2]

        # A — build input tensor
        input_tensor = self._preprocess(image)

        # B — run the session
        ort_inputs  = {self._input_name: input_tensor}
        raw_outputs = self._session.run(None, ort_inputs)

        # C — decode output
        boxes, labels, scores = self._postprocess(
            raw_outputs[0], orig_w, orig_h, conf_threshold
        )

        logger.debug(
            f"[Step 2] ONNX run complete — "
            f"{len(boxes)} detections above threshold={conf_threshold}"
        )
        return boxes, labels, scores


# ===========================================================================
# DummyInferenceSession
# ===========================================================================
class DummyInferenceSession:
    """
    Stand-in session used when the .onnx file is not yet available.

    Returns a single realistic synthetic detection so every downstream
    step (preprocessing → acoustic filter → geolocation → report) can
    be developed and tested without a trained model.

    Swap it out by placing 'sonarsentinel.onnx' in backend/models/ —
    the factory function below handles the switch automatically with no
    code changes required.
    """

    is_loaded: bool = False
    mode:      str  = "DUMMY"

    def run(
        self,
        image: np.ndarray,
        conf_threshold: float = 0.25,
    ) -> tuple[list[dict], list[str], list[float]]:
        """Returns one synthetic detection centred in the image."""
        h, w  = image.shape[:2]
        bw    = max(40, w // 8)
        bh    = max(30, h // 8)
        cx    = w // 2
        cy    = h // 2
        x1    = float(cx - bw // 2)
        y1    = float(cy - bh // 2)
        x2    = float(cx + bw // 2)
        y2    = float(cy + bh // 2)

        box = {
            "x1": x1, "y1": y1,
            "x2": x2, "y2": y2,
            "width":  x2 - x1,
            "height": y2 - y1,
        }
        logger.debug("[Step 2] DummyInferenceSession — returned 1 synthetic detection.")
        return [box], ["unknown_anomaly"], [0.91]


# ===========================================================================
# Module-level singleton — import this everywhere else in the backend
# ===========================================================================
def _build_session() -> OnnxInferenceSession | DummyInferenceSession:
    """
    Factory: tries OnnxInferenceSession first; falls back to Dummy if
    the model file is absent or onnxruntime is not installed.
    """
    session = OnnxInferenceSession(ONNX_MODEL_PATH)
    if session.is_loaded:
        return session

    logger.info(
        "[Step 2] Falling back to DummyInferenceSession. "
        "Place 'sonarsentinel.onnx' in backend/models/ to enable ONNX mode."
    )
    return DummyInferenceSession()


# Build once at import time — zero overhead per request.
onnx_session: OnnxInferenceSession | DummyInferenceSession = _build_session()
