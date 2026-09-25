# Step 2 — Model-Loading Service

> **Build Order:** `SonarSentinel_Backend_Build_Order.txt` → Step 2  
> **Depends on:** Step 1 (FastAPI scaffold with health-check running)

---

## What this step delivers

A production-quality ONNX model-loading service that satisfies the build
order requirement exactly:

> *"Write a class that loads your exported ONNX model once at startup  
> (not per-request) using `onnxruntime.InferenceSession`, and exposes a  
> `run(image)` method that returns raw bounding boxes, class labels, and  
> confidence scores."*

---

## Files in this folder

| File | Purpose |
|---|---|
| `inference.py` | The complete Step 2 implementation |
| `requirements_step2.txt` | Only the new dependency (`onnxruntime`) |
| `README.md` | This file |

---

## How to install

```powershell
# From the backend/ folder (with venv active)
pip install -r step2_model_loading/requirements_step2.txt
```

---

## How to integrate into main.py

Add **two** snippets to `backend/app/main.py`:

**1. Import (top of file)**
```python
from step2_model_loading.inference import onnx_session
```

**2. Inside the `lifespan()` startup block**
```python
logger.info(
    f"[Step 2] Inference session ready — "
    f"mode={onnx_session.mode} | loaded={onnx_session.is_loaded}"
)
```

---

## How to use in a route

```python
from step2_model_loading.inference import onnx_session

# image is a BGR uint8 numpy array (output of preprocessing step)
boxes, labels, scores = onnx_session.run(image, conf_threshold=0.25)

# boxes  → list of dicts: {x1, y1, x2, y2, width, height}
# labels → list of str:   ghost_net | cylinder | pipe | wreckage | unknown_anomaly
# scores → list of float: raw ONNX confidence [0.0 – 1.0]
```

---

## ONNX model file

Place the exported weights at:
```
backend/models/sonarsentinel.onnx
```

**If the file is absent** → `DummyInferenceSession` activates automatically
and returns a synthetic detection so Steps 3-8 can still be developed
and tested without the trained model.  
**Once the file exists** → `OnnxInferenceSession` loads it automatically,
no code change required.

---

## Class summary

```
OnnxInferenceSession
├── _load_model()       loads .onnx once at import time
├── _preprocess(image)  BGR → float32 NCHW tensor (640×640)
├── _postprocess(...)   raw [1,9,N] tensor → boxes / labels / scores
└── run(image, conf)    PUBLIC — called by routes/services

DummyInferenceSession
└── run(image, conf)    returns 1 synthetic box (development fallback)

onnx_session            module-level singleton (import this everywhere)
```
