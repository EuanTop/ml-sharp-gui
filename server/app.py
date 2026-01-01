import os
import sys
import json
from pathlib import Path
from typing import Optional

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import tkinter as tk
from tkinter import filedialog

# Try to locate the SHARP package source in sibling 'ml-sharp-main/src'
APP_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = APP_DIR.parents[1]  # .../SHARP
SHARP_SRC_CANDIDATES = [
    WORKSPACE_ROOT / "ml-sharp-main" / "src",
    WORKSPACE_ROOT / "src",  # fallback if user installed package here
]
for p in SHARP_SRC_CANDIDATES:
    if p.exists() and str(p) not in sys.path:
        sys.path.insert(0, str(p))

import torch
import numpy as np
from sharp.models import PredictorParams, create_predictor, RGBGaussianPredictor
from sharp.utils import io as sharp_io
from sharp.utils.gaussians import save_ply, unproject_gaussians, Gaussians3D

# MPS optimization settings
if hasattr(torch, "mps") and torch.mps.is_available():
    # Enable MPS fallback for unsupported operations
    os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
    print("[MPS] Enabled MPS fallback for unsupported operations")

DEFAULT_MODEL_URL = "https://ml-site.cdn-apple.com/models/sharp/sharp_2572gikvuh.pt"
DEFAULT_CACHE_DIR = str(Path.home() / ".cache/torch/hub/checkpoints")

app = Flask(__name__)
CORS(app)

# Simple in-process cache to avoid reloading the model for every request
_PREDICTOR_CACHE: dict[str, tuple[RGBGaussianPredictor, str]] = {}

DATA_DIR = APP_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
OUTPUT_DIR = DATA_DIR / "outputs"
CONFIG_PATH = APP_DIR / "config.json"
for d in [DATA_DIR, UPLOAD_DIR, OUTPUT_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text("utf-8"))
        except Exception:
            pass
    return {"model_path": DEFAULT_CACHE_DIR, "device": "default"}


def save_config(cfg: dict) -> None:
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


def _resolve_device(name: str) -> str:
    if name == "default":
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch, "mps") and torch.mps.is_available():
            return "mps"
        return "cpu"
    return name


def _find_checkpoint_from_dir(directory: Path) -> Optional[Path]:
    if not directory.exists() or not directory.is_dir():
        return None
    cand = sorted(list(directory.glob("sharp_*.pt")))
    if not cand:
        cand = sorted(list(directory.glob("*.pt")))
    return cand[0] if cand else None


def _load_state_dict(checkpoint_path: Optional[Path]) -> dict:
    if checkpoint_path is None:
        return torch.hub.load_state_dict_from_url(DEFAULT_MODEL_URL, progress=True)
    return torch.load(checkpoint_path, weights_only=True)


def _get_predictor(device_name: str, checkpoint_path: Optional[Path]) -> RGBGaussianPredictor:
    """Return a cached predictor on the requested device and checkpoint."""
    key = f"{device_name}|{checkpoint_path}"
    if key in _PREDICTOR_CACHE:
        predictor, _ = _PREDICTOR_CACHE[key]
        return predictor

    state = _load_state_dict(checkpoint_path)
    predictor = create_predictor(PredictorParams())
    predictor.load_state_dict(state)
    predictor.eval().to(device_name)

    # MPS optimization: warm up the model with a dummy inference
    if device_name == "mps":
        print("[MPS] Warming up model with dummy inference to compile Metal shaders...")
        import time
        t0 = time.time()
        with torch.no_grad():
            dummy_input = torch.randn(1, 3, 512, 512, device=device_name)
            dummy_disparity = torch.tensor([1.0], device=device_name)
            try:
                _ = predictor(dummy_input, dummy_disparity)
            except Exception as e:
                print(f"[MPS] Warmup warning: {e}")
        print(f"[MPS] Warmup completed in {time.time() - t0:.2f}s")

    # Keep only one entry to limit memory; clear older ones
    _PREDICTOR_CACHE.clear()
    _PREDICTOR_CACHE[key] = (predictor, key)
    return predictor


@app.get("/api/health")
def health():
    return jsonify(
        {
            "torch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "mps_available": hasattr(torch, "mps") and torch.mps.is_available(),
            "default_device": _resolve_device("default"),
        }
    )


@torch.no_grad()
def _predict_image(
    predictor: RGBGaussianPredictor, image_np: np.ndarray, f_px: float, device: torch.device, fast_mode: bool = False
) -> Gaussians3D:
    import time
    import torch.nn.functional as F
    # Keep standard resolution - model architecture requires specific dimensions
    internal_shape = (1536, 1536)
    
    t0 = time.time()
    image_pt = torch.from_numpy(image_np.copy()).float().to(device).permute(2, 0, 1) / 255.0
    _, h, w = image_pt.shape
    image_resized = F.interpolate(
        image_pt[None], size=(internal_shape[1], internal_shape[0]), mode="bilinear", align_corners=True
    )
    disparity_factor = torch.tensor([f_px / w]).float().to(device)
    t_preprocess = time.time() - t0
    
    t0 = time.time()
    gauss_ndc = predictor(image_resized, disparity_factor)
    t_model = time.time() - t0

    t0 = time.time()
    K = (
        torch.tensor(
            [
                [f_px, 0, w / 2, 0],
                [0, f_px, h / 2, 0],
                [0, 0, 1, 0],
                [0, 0, 0, 1],
            ]
        )
        .float()
        .to(device)
    )
    K_resized = K.clone()
    K_resized[0] *= internal_shape[0] / w
    K_resized[1] *= internal_shape[1] / h
    gauss = unproject_gaussians(gauss_ndc, torch.eye(4).to(device), K_resized, internal_shape)
    t_postprocess = time.time() - t0
    
    print(f"    └─ Preprocess:  {t_preprocess:.3f}s")
    print(f"    └─ Model fwd:   {t_model:.3f}s  <-- Neural network")
    print(f"    └─ Postprocess: {t_postprocess:.3f}s")
    
    return gauss


@app.get("/api/config")
def get_config():
    return jsonify(load_config())


@app.post("/api/config")
def set_config():
    cfg = load_config()
    body = request.get_json(silent=True) or {}
    if "model_path" in body:
        cfg["model_path"] = body["model_path"]
    if "device" in body:
        cfg["device"] = body["device"]
    save_config(cfg)
    return jsonify(cfg)


@app.post("/api/predict")
def predict():
    import time
    timing = {}
    t_start = time.time()
    
    cfg = load_config()
    device_name = _resolve_device(cfg.get("device", "default"))

    if "image" not in request.files:
        return jsonify({"error": "missing file field 'image'"}), 400

    file = request.files["image"]
    suffix = Path(file.filename).suffix.lower()
    if suffix not in sharp_io.get_supported_image_extensions():
        return jsonify({"error": f"unsupported image type: {suffix}"}), 400

    # Save upload
    t0 = time.time()
    upload_path = UPLOAD_DIR / Path(file.filename).name
    file.save(upload_path)
    timing['file_save'] = time.time() - t0

    # Resolve checkpoint from override or config
    t0 = time.time()
    override = request.form.get("checkpoint_path") or request.args.get("checkpoint_path")
    model_path_cfg = Path(override or cfg.get("model_path", DEFAULT_CACHE_DIR)).expanduser()
    checkpoint_path: Optional[Path] = None
    if model_path_cfg.is_file():
        checkpoint_path = model_path_cfg
    elif model_path_cfg.is_dir():
        checkpoint_path = _find_checkpoint_from_dir(model_path_cfg)
    timing['checkpoint_resolve'] = time.time() - t0

    t0 = time.time()
    predictor = _get_predictor(device_name, checkpoint_path)
    timing['model_load'] = time.time() - t0

    t0 = time.time()
    image_np, _, f_px = sharp_io.load_rgb(upload_path)
    timing['image_load'] = time.time() - t0
    
    t0 = time.time()
    gauss = _predict_image(predictor, image_np, f_px, torch.device(device_name))
    timing['inference'] = time.time() - t0

    # Save PLY for external viewers
    t0 = time.time()
    out_ply = OUTPUT_DIR / f"{upload_path.stem}.ply"
    save_ply(gauss, f_px, (image_np.shape[0], image_np.shape[1]), out_ply)
    timing['save_ply'] = time.time() - t0

    # Pack JSON for web visualization
    t0 = time.time()
    mv = gauss.mean_vectors.flatten(0, 1).detach().cpu().numpy()
    sv = gauss.singular_values.flatten(0, 1).detach().cpu().numpy()
    col = gauss.colors.flatten(0, 1).detach().cpu().numpy()
    opa = gauss.opacities.flatten(0, 1).detach().cpu().numpy()
    timing['to_numpy'] = time.time() - t0

    # Downsample by opacity if needed
    t0 = time.time()
    try:
        max_points = int(request.form.get("max_points", request.args.get("max_points", 120000)))
    except Exception:
        max_points = 120000

    N = mv.shape[0]
    if N > max_points:
        w = opa / (opa.sum() + 1e-8)
        idx = np.random.choice(N, size=max_points, replace=False, p=w)
        mv, sv, col, opa = mv[idx], sv[idx], col[idx], opa[idx]

    size = sv.mean(axis=1)
    # Clamp to a reasonable range for screen-space points
    size = np.clip(size, 0.001, np.percentile(size, 99))
    timing['downsample'] = time.time() - t0

    timing['total'] = time.time() - t_start
    
    # Print timing breakdown
    print("\n" + "="*50)
    print("PERFORMANCE BREAKDOWN:")
    print(f"  File save:        {timing['file_save']:.3f}s")
    print(f"  Checkpoint:       {timing['checkpoint_resolve']:.3f}s")
    print(f"  Model load:       {timing['model_load']:.3f}s")
    print(f"  Image load:       {timing['image_load']:.3f}s")
    print(f"  **INFERENCE**:    {timing['inference']:.3f}s  <-- Core prediction")
    print(f"  Save PLY:         {timing['save_ply']:.3f}s")
    print(f"  To numpy:         {timing['to_numpy']:.3f}s")
    print(f"  Downsample:       {timing['downsample']:.3f}s")
    print(f"  ─────────────────")
    print(f"  TOTAL:            {timing['total']:.3f}s")
    print(f"  Device: {device_name}")
    print("="*50 + "\n")

    return jsonify(
        {
            "positions": mv.tolist(),
            "colors": col.tolist(),
            "sizes": size.tolist(),
            "opacities": opa.tolist(),
            "ply_url": f"/api/files/{out_ply.name}",
            "count": int(mv.shape[0]),
            "device": device_name,
            "checkpoint": str(checkpoint_path) if checkpoint_path else None,
            "timing": timing,
        }
    )


@app.get("/api/files/<path:filename>")
def files(filename: str):
    return send_from_directory(OUTPUT_DIR, filename, as_attachment=False)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5005))
    app.run(host="0.0.0.0", port=port, debug=True)
