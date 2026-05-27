from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.model_loader import load_models
from app.api import fraud, history, compare, health
from app.db.database import create_tables
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — load models once
    logger.info("🚀 Loading ML models...")
    load_models()
    logger.info("✅ Models loaded and ready")
    create_tables()
    logger.info("✅ Database ready")
    yield
    # Shutdown
    logger.info("👋 Shutting down")


app = FastAPI(
    title="Ethereum Fraud Detection API",
    description="XGBoost + GraphSAGE ensemble fraud detection for Ethereum wallets",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,   prefix="/api",         tags=["Health"])
app.include_router(fraud.router,    prefix="/api/fraud",   tags=["Fraud Detection"])
app.include_router(history.router,  prefix="/api/history", tags=["History"])
app.include_router(compare.router,  prefix="/api/compare", tags=["Compare"])
