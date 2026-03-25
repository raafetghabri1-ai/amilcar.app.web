from __future__ import annotations

from pathlib import Path

import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.device_token import DeviceToken


class NotificationService:
    def __init__(self) -> None:
        self._app: firebase_admin.App | None = None

    def _get_absolute_credentials_path(self) -> Path:
        configured_path = Path(settings.FIREBASE_SERVICE_ACCOUNT_FILE)
        if configured_path.is_absolute():
            return configured_path
        project_root = Path(__file__).resolve().parents[3]
        return project_root / configured_path

    def is_configured(self) -> bool:
        return self._get_absolute_credentials_path().exists()

    def _initialize(self) -> firebase_admin.App:
        if self._app is not None:
            return self._app

        credentials_path = self._get_absolute_credentials_path()
        if not credentials_path.exists():
            raise FileNotFoundError(
                f"Firebase service account file not found: {credentials_path}"
            )

        if firebase_admin._apps:
            self._app = firebase_admin.get_app()
            return self._app

        cred = credentials.Certificate(str(credentials_path))
        self._app = firebase_admin.initialize_app(cred)
        return self._app

    async def send_to_client(
        self,
        db: AsyncSession,
        client_id: int,
        *,
        title: str,
        body: str,
        data: dict[str, str] | None = None,
    ) -> dict[str, int]:
        result = await db.execute(
            select(DeviceToken).where(DeviceToken.client_id == client_id)
        )
        devices = result.scalars().all()
        if not devices:
            return {"sent": 0, "failed": 0}

        try:
            self._initialize()
        except FileNotFoundError:
            return {"sent": 0, "failed": len(devices)}

        success_count = 0
        failure_count = 0

        for device in devices:
            try:
                message = messaging.Message(
                    token=device.fcm_token,
                    notification=messaging.Notification(title=title, body=body),
                    data=data or {},
                    android=messaging.AndroidConfig(priority="high"),
                )
                messaging.send(message)
                success_count += 1
            except Exception:
                failure_count += 1

        return {"sent": success_count, "failed": failure_count}


notification_service = NotificationService()
