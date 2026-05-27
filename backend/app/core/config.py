from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ETHERSCAN_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./fraud_detection.db"
    MAX_HOPS: int = 3
    MAX_TXS_PER_ADDR: int = 50
    FRAUD_THRESHOLD: float = 0.5
    XGB_WEIGHT: float = 0.6
    SAGE_WEIGHT: float = 0.4
    ETHERSCAN_BASE: str = "https://api.etherscan.io/v2/api"
    CHAIN_ID: int = 1
    WEI: float = 1e-18

    class Config:
        env_file = ".env"


settings = Settings()
