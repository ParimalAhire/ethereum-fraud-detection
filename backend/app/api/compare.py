from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db, WalletAnalysis
from app.schemas.schemas import CompareRequest, CompareResult, AnalysisResult
from app.api.fraud import _run_analysis, _is_valid_eth_address
from datetime import datetime
import json

router = APIRouter()


def _get_or_analyze(wallet: str, db: Session) -> AnalysisResult:
    if not _is_valid_eth_address(wallet):
        raise HTTPException(status_code=400, detail=f"Invalid address: {wallet}")

    cached = (
        db.query(WalletAnalysis)
        .filter(WalletAnalysis.wallet == wallet)
        .order_by(WalletAnalysis.analyzed_at.desc())
        .first()
    )

    if cached:
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

    result = _run_analysis(wallet, db)
    return AnalysisResult(**result)


@router.post("/", response_model=CompareResult)
def compare_wallets(req: CompareRequest, db: Session = Depends(get_db)):
    if req.wallet_a.lower() == req.wallet_b.lower():
        raise HTTPException(status_code=400, detail="Please provide two different wallet addresses")

    result_a = _get_or_analyze(req.wallet_a, db)
    result_b = _get_or_analyze(req.wallet_b, db)

    return CompareResult(wallet_a=result_a, wallet_b=result_b)
