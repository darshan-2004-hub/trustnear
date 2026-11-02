import os
import secrets
import warnings
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Security & Tokens
    _jwt_secret = os.getenv("JWT_SECRET_KEY")
    if not _jwt_secret or _jwt_secret == "fallback-secret-key":
        warnings.warn("[Security Notice] JWT_SECRET_KEY is using a development default. Configure a high-entropy secret in backend/.env for production.")
        _jwt_secret = _jwt_secret or secrets.token_hex(32)

    SECRET_KEY = _jwt_secret
    JWT_SECRET_KEY = _jwt_secret
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:5000").split(",")
    if "*" in os.getenv("CORS_ORIGINS", "*"):
        CORS_ORIGINS = "*"

    # MySQL Database Connection URI
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "trustnear_db")
    
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
    }