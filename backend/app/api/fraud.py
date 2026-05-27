from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db, WalletAnalysis
from app.schemas.schemas import AnalyzeRequest, AnalysisResult
from app.services.inference import (
    build_transaction_graph, score_wallets, score_edges,
    compute_wallet_risk, build_react_flow_graph,
)
from app.core.config import settings
from datetime import datetime
import json
import re
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Option 1: Whitelist of known legitimate entities ─────────────────────────
WHITELIST = {
    "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae": "Ethereum Foundation",
    "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": "Binance Cold Wallet",
    "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503": "Binance",
    "0x28c6c06298d514db089934071355e5743bf21d60": "Binance Hot Wallet",
    "0xfe89cc7abb2c4183683ab71653c4cdc9b02d44b7": "ENS DAO Treasury",
    "0xd8da6bf26964af9d7eed9e03e53415d37aa96045": "Vitalik Buterin",
}

# ── Option 4: Confidence flag thresholds ─────────────────────────────────────
HIGH_VOLUME_TX_THRESHOLD = 200   # wallets with more txs than this
LOW_ERROR_RATE_THRESHOLD = 0.02  # error rate below this = likely legitimate


def _is_valid_eth_address(addr: str) -> bool:
    return bool(re.match(r"^0x[a-fA-F0-9]{40}$", addr))


def _get_confidence_flag(wallet: str, addr_feats: dict, risk_rating: str):
    """Option 4 — return a warning flag if result may be a false positive."""
    feats = addr_feats.get(wallet.lower(), {})
    if not feats:
        return None
    total_txs  = feats.get("total_txs", 0)
    error_rate = feats.get("error_rate", 0)
    if risk_rating == "HIGH" and total_txs > HIGH_VOLUME_TX_THRESHOLD and error_rate < LOW_ERROR_RATE_THRESHOLD:
        return (
            f"⚠️ Manual review recommended — this wallet has high transaction volume "
            f"({total_txs} txs) with a very low error rate ({error_rate:.2%}), "
            f"which may indicate a legitimate high-volume entity (exchange, foundation, DAO) "
            f"rather than fraud."
        )
    return None


def _save_to_db(db: Session, result: dict):
    db_record = WalletAnalysis(
        wallet=result["wallet"],
        risk_rating=result["risk_rating"],
        combined_risk=result["combined_risk"],
        own_score=result["own_score"],
        xgb_score=result.get("xgb_score", 0),
        sage_score=result.get("sage_score", 0),
        frac_flagged=result["frac_flagged"],
        flagged_wallets=result["flagged_wallets"],
        flagged_edges=result["flagged_edges"],
        total_wallets=result["total_wallets"],
        total_edges=result["total_edges"],
        wallet_scores=json.dumps(result.get("wallet_scores", [])),
        edge_scores=json.dumps(result.get("edge_scores", [])),
        graph_data=json.dumps(result.get("graph_data", {"nodes": [], "edges": []})),
        analyzed_at=result["analyzed_at"],
    )
    db.add(db_record)
    db.commit()


def _run_analysis(wallet: str, db: Session) -> dict:
    """Run full inference pipeline and return result dict."""

    # ── Option 1: Whitelist check — skip model entirely ──────────────────────
    wallet_lower = wallet.lower()
    if wallet_lower in WHITELIST:
        entity_name = WHITELIST[wallet_lower]
        logger.info(f"Whitelist hit for {wallet} ({entity_name})")
        result = {
            "wallet":          wallet,
            "risk_rating":     "LOW",
            "combined_risk":   0.0,
            "own_score":       0.0,
            "xgb_score":       0.0,
            "sage_score":      0.0,
            "frac_flagged":    0.0,
            "flagged_wallets": 0,
            "flagged_edges":   0,
            "total_wallets":   0,
            "total_edges":     0,
            "wallet_scores":   [],
            "edge_scores":     [],
            "graph_data":      {"nodes": [], "edges": []},
            "analyzed_at":     datetime.utcnow(),
            "cached":          False,
            "confidence_flag": f"✅ Whitelisted entity: {entity_name} — known legitimate wallet.",
        }
        _save_to_db(db, result)
        return result

    # ── Run full ML pipeline ──────────────────────────────────────────────────
    G, addr_feats = build_transaction_graph(wallet)

    if not addr_feats:
        raise HTTPException(status_code=404, detail="No transaction data found for this wallet")

    scores      = score_wallets(addr_feats, G)
    edge_scores = score_edges(G, scores)
    risk        = compute_wallet_risk(wallet, scores)
    graph_data  = build_react_flow_graph(G, scores, edge_scores, wallet)

    root_s    = scores.get(wallet.lower(), {})
    threshold = settings.FRAUD_THRESHOLD

    # Build wallet_scores list (top 100 by ensemble score)
    wallet_scores_list = sorted(
        [{"address": k, **v} for k, v in scores.items()],
        key=lambda x: x["ensemble"], reverse=True
    )[:100]

    # Build edge_scores list (top 200 by score)
    edge_scores_list = sorted(
        [{"from_addr": k.split("|")[0], "to_addr": k.split("|")[1],
          "score": v, "flagged": v > threshold}
         for k, v in edge_scores.items()],
        key=lambda x: x["score"], reverse=True
    )[:200]

    # ── Option 4: Confidence flag ─────────────────────────────────────────────
    confidence_flag = _get_confidence_flag(wallet, addr_feats, risk["rating"])

    result = {
        "wallet":          wallet,
        "risk_rating":     risk["rating"],
        "combined_risk":   round(risk["combined"], 4),
        "own_score":       round(risk["root_score"], 4),
        "xgb_score":       round(root_s.get("xgb", 0), 4),
        "sage_score":      round(root_s.get("sage", 0), 4),
        "frac_flagged":    round(risk["frac_flagged"], 4),
        "flagged_wallets": risk["flagged_count"],
        "flagged_edges":   sum(1 for v in edge_scores.values() if v > threshold),
        "total_wallets":   G.number_of_nodes(),
        "total_edges":     G.number_of_edges(),
        "wallet_scores":   wallet_scores_list,
        "edge_scores":     edge_scores_list,
        "graph_data":      graph_data,
        "analyzed_at":     datetime.utcnow(),
        "cached":          False,
        "confidence_flag": confidence_flag,
    }

    _save_to_db(db, result)
    return result


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_wallet(req: AnalyzeRequest, db: Session = Depends(get_db)):
    wallet = req.wallet.strip()

    if not _is_valid_eth_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid Ethereum wallet address")

    # Check cache first
    cached = (
        db.query(WalletAnalysis)
        .filter(WalletAnalysis.wallet == wallet)
        .order_by(WalletAnalysis.analyzed_at.desc())
        .first()
    )

    if cached:
        logger.info(f"Cache hit for {wallet}")
        return AnalysisResult(
            wallet=cached.wallet,
            risk_rating=cached.risk_rating,
            combined_risk=cached.combined_risk,
            own_score=cached.own_score,
            xgb_score=cached.xgb_score,
            sage_score=cached.sage_score,
            frac_flagged=cached.frac_flagged,
            flagged_wallets=cached.flagged_wallets,
            flagged_edges=cached.flagged_edges,
            total_wallets=cached.total_wallets,
            total_edges=cached.total_edges,
            wallet_scores=json.loads(cached.wallet_scores or "[]"),
            edge_scores=json.loads(cached.edge_scores or "[]"),
            graph_data=json.loads(cached.graph_data or '{"nodes":[],"edges":[]}'),
            analyzed_at=cached.analyzed_at,
            cached=True,
        )

    logger.info(f"Running fresh analysis for {wallet}")
    result = _run_analysis(wallet, db)
    return AnalysisResult(**result)


@router.delete("/cache/{wallet}")
async def clear_cache(wallet: str, db: Session = Depends(get_db)):
    """Force re-analysis by clearing cached result."""
    deleted = db.query(WalletAnalysis).filter(WalletAnalysis.wallet == wallet).delete()
    db.commit()
    return {"message": f"Cleared {deleted} cached record(s) for {wallet}"}