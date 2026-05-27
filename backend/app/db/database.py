from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from datetime import datetime

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class WalletAnalysis(Base):
    __tablename__ = "wallet_analyses"

    id             = Column(Integer, primary_key=True, index=True)
    wallet         = Column(String, index=True)
    risk_rating    = Column(String)
    combined_risk  = Column(Float)
    own_score      = Column(Float)
    xgb_score      = Column(Float)
    sage_score     = Column(Float)
    frac_flagged   = Column(Float)
    flagged_wallets= Column(Integer)
    flagged_edges  = Column(Integer)
    total_wallets  = Column(Integer)
    total_edges    = Column(Integer)
    wallet_scores  = Column(Text)   # JSON string
    edge_scores    = Column(Text)   # JSON string
    graph_data     = Column(Text)   # JSON string (nodes + edges for React Flow)
    analyzed_at    = Column(DateTime, default=datetime.utcnow)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
