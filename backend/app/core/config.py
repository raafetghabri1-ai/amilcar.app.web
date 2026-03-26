import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "AMILCAR Auto Care API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "نظام إدارة متكامل لمركز عناية السيارات الفاخرة - محرس، صفاقس، تونس"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://amilcar_user:amilcar_pass@localhost:5432/amilcar_db",
    )
    DATABASE_URL_SYNC: str = os.getenv(
        "DATABASE_URL_SYNC",
        "postgresql://amilcar_user:amilcar_pass@localhost:5432/amilcar_db",
    )

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    _origins_raw: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8000")
    ALLOWED_ORIGINS: list[str] = [o.strip() for o in _origins_raw.split(",") if o.strip()]

    # Firebase / Push Notifications
    FIREBASE_PROJECT_ID: str | None = os.getenv("FIREBASE_PROJECT_ID")
    FIREBASE_SERVICE_ACCOUNT_FILE: str = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_FILE",
        "backend/firebase/service-account.json",
    )


settings = Settings()
