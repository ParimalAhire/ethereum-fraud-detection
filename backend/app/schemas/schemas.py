from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class AnalyzeRequest(BaseModel):
    wallet: str


class WalletScore(BaseModel):
    address:  str
    xgb:      float
    sage:     float
    ensemble: float


class EdgeScore(BaseModel):
    from_addr:   str
    to_addr:     str
    score:       float
    flagged:     bool


class ReactFlowNode(BaseModel):
    id:       str
    position: Dict[str, float]
    data:     Dict[str, Any]
    type:     str


class ReactFlowEdge(BaseModel):
    id:       str
    source:   str
    target:   str
    data:     Dict[str, Any]
    style:    Dict[str, Any]
    animated: bool


class AnalysisResult(BaseModel):
    wallet:          str
    risk_rating:     str
    combined_risk:   float
    own_score:       float
    xgb_score:       float
    sage_score:      float
    frac_flagged:    float
    flagged_wallets: int
    flagged_edges:   int
    total_wallets:   int
    total_edges:     int
    wallet_scores:   List[WalletScore]
    edge_scores:     List[EdgeScore]
    graph_data:      Dict[str, List]
    analyzed_at:     datetime
    cached:          bool = False
    confidence_flag: Optional[str] = None  # ← added


class HistoryItem(BaseModel):
    id:              int
    wallet:          str
    risk_rating:     str
    combined_risk:   float
    total_wallets:   int
    flagged_wallets: int
    analyzed_at:     datetime

    class Config:
        from_attributes = True


class CompareRequest(BaseModel):
    wallet_a: str
    wallet_b: str


class CompareResult(BaseModel):
    wallet_a: AnalysisResult
    wallet_b: AnalysisResult