from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db, WalletAnalysis
from app.schemas.schemas import HistoryItem
from typing import List

router = APIRouter()


@router.get("/", response_model=List[HistoryItem])
def get_history(
    limit:  int = Query(default=20, le=100),
    offset: int = Query(default=0),
    db:     Session = Depends(get_db),
):
    records = (
        db.query(WalletAnalysis)
        .order_by(WalletAnalysis.analyzed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return records


@router.get("/search/{wallet}", response_model=List[HistoryItem])
def search_history(wallet: str, db: Session = Depends(get_db)):
    records = (
        db.query(WalletAnalysis)
        .filter(WalletAnalysis.wallet.ilike(f"%{wallet}%"))
        .order_by(WalletAnalysis.analyzed_at.desc())
        .limit(10)
        .all()
    )
    return records


@router.delete("/{wallet_id}")
def delete_history(wallet_id: int, db: Session = Depends(get_db)):
    db.query(WalletAnalysis).filter(WalletAnalysis.id == wallet_id).delete()
    db.commit()
    return {"message": "Deleted"}
