from fastapi import APIRouter
from app.core.model_loader import get_models

router = APIRouter()


@router.get("/health")
def health():
    _, _, sage_model, feature_cols, ensemble_cfg, device = get_models()
    return {
        "status":        "ok",
        "model_loaded":  sage_model is not None,
        "features":      len(feature_cols) if feature_cols else 0,
        "device":        str(device),
        "xgb_weight":    ensemble_cfg["xgb_weight"] if ensemble_cfg else None,
        "sage_weight":   ensemble_cfg["sage_weight"] if ensemble_cfg else None,
    }


@router.get("/warmup")
def warmup():
    """Frontend pings this on page load to keep the server warm."""
    return {"status": "warm"}
