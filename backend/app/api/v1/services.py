from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles, get_current_user
from app.models.user import User, UserRole
from app.models.service import Service, ServiceCategory
from app.schemas.service import ServiceCreate, ServiceOut

router = APIRouter()


@router.get("/", response_model=list[ServiceOut])
async def list_services(
    category: ServiceCategory | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """قائمة الخدمات — متاحة للجميع، مع فلترة بالفئة والبحث بالاسم"""
    query = select(Service).where(Service.is_active.is_(True))
    if category:
        query = query.where(Service.category == category)
    if search:
        query = query.where(
            Service.name.ilike(f"%{search}%") | Service.name_ar.ilike(f"%{search}%")
        )
    result = await db.execute(query.order_by(Service.category))
    return result.scalars().all()


@router.get("/all", response_model=list[ServiceOut])
async def list_all_services(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """قائمة كل الخدمات للمدير، بما في ذلك غير النشطة"""
    result = await db.execute(select(Service).order_by(Service.category, Service.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """إضافة خدمة — للمدير فقط"""
    service = Service(**data.model_dump())
    db.add(service)
    await db.flush()
    await db.refresh(service)
    return service


@router.get("/{service_id}", response_model=ServiceOut)
async def get_service(service_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="الخدمة غير موجودة")
    return service


@router.patch("/{service_id}", response_model=ServiceOut)
async def update_service(
    service_id: int,
    data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="الخدمة غير موجودة")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    await db.flush()
    await db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="الخدمة غير موجودة")
    await db.delete(service)
