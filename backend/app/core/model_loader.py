import os
import json
import joblib
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# ── Globals (loaded once at startup) ─────────────────────────────────────────
_scaler       = None
_xgb_model    = None
_sage_model   = None
_feature_cols = None
_ensemble_cfg = None
_device       = None

MODEL_DIR = Path(__file__).parent.parent.parent / "models"


class GraphSAGEModel(nn.Module):
    def __init__(self, in_dim, hidden_dim, num_layers, dropout):
        super().__init__()
        self.convs   = nn.ModuleList()
        self.bns     = nn.ModuleList()
        self.dropout = dropout
        dims = [in_dim] + [hidden_dim] * num_layers
        for i in range(num_layers):
            self.convs.append(SAGEConv(dims[i], dims[i + 1], aggr="mean"))
            self.bns.append(nn.BatchNorm1d(dims[i + 1]))
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, 2),
        )

    def forward(self, x, edge_index):
        for conv, bn in zip(self.convs, self.bns):
            x = conv(x, edge_index)
            x = bn(x)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
        return self.classifier(x)

    def predict_proba(self, x, edge_index):
        # Set BN layers to train mode to avoid CPU eval mode issues
        self.eval()
        for module in self.modules():
            if isinstance(module, nn.BatchNorm1d):
                module.train()
        with torch.no_grad():
            out = self(x, edge_index)
            out = torch.nan_to_num(out, nan=0.0)
            return F.softmax(out, dim=1)[:, 1].cpu().numpy()


def load_models():
    global _scaler, _xgb_model, _sage_model, _feature_cols, _ensemble_cfg, _device

    _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Device: {_device}")

    # Feature cols
    feat_path = MODEL_DIR / "feature_cols.json"
    with open(feat_path) as f:
        _feature_cols = json.load(f)
    logger.info(f"Feature cols loaded: {len(_feature_cols)}")

    # Scaler
    _scaler = joblib.load(MODEL_DIR / "scaler_v3.pkl")
    logger.info("Scaler loaded")

    # XGBoost
    import xgboost as xgb
    _xgb_model = xgb.XGBClassifier()
    _xgb_model.load_model(MODEL_DIR / "xgboost_v3.json")
    logger.info("XGBoost loaded")

    # Ensemble config
    with open(MODEL_DIR / "ensemble_v3.json") as f:
        _ensemble_cfg = json.load(f)
    logger.info(f"Ensemble config: XGB={_ensemble_cfg['xgb_weight']} SAGE={_ensemble_cfg['sage_weight']}")

    # GraphSAGE
    ckpt = torch.load(MODEL_DIR / "graphsage_v3.pt", map_location=_device)
    _sage_model = GraphSAGEModel(
        in_dim=ckpt["in_dim"],
        hidden_dim=ckpt["hidden_dim"],
        num_layers=ckpt["num_layers"],
        dropout=ckpt["dropout"],
    ).to(_device)
    _sage_model.load_state_dict(ckpt["state_dict"])
    _sage_model.eval()
    logger.info(f"GraphSAGE loaded — F1: {ckpt['best_f1']:.4f}")


def get_models():
    return _scaler, _xgb_model, _sage_model, _feature_cols, _ensemble_cfg, _device