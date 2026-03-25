from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles, get_current_user
from app.models.device_token import DeviceToken
from app.models.user import User, UserRole
from app.schemas.device_token import DeviceTokenCreate, DeviceTokenOut

router = APIRouter()


@router.post("/", response_model=DeviceTokenOut)
async def register_device_token(
    data: DeviceTokenCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
):
    """Save or update an FCM token for the current client."""
    existing = (
        await db.execute(
            select(DeviceToken).where(DeviceToken.fcm_token == data.fcm_token)
        )
    ).scalar_one_or_none()

    if existing:
        existing.client_id = current_user.id
        existing.platform = data.platform
        await db.flush()
        await db.refresh(existing)
        return existing

    client_existing = (
        await db.execute(
            select(DeviceToken).where(
                DeviceToken.client_id == current_user.id,
                DeviceToken.platform == data.platform,
            )
        )
    ).scalar_one_or_none()
    if client_existing:
        client_existing.fcm_token = data.fcm_token
        await db.flush()
        await db.refresh(client_existing)
        return client_existing

    device = DeviceToken(
        client_id=current_user.id,
        fcm_token=data.fcm_token,
        platform=data.platform,
    )
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


@router.get("/me", response_model=list[DeviceTokenOut])
async def list_my_device_tokens(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.client_id == current_user.id)
    )
    return result.scalars().all()
