from datetime import date as date_type, time as time_type
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.attendance import Attendance
from app.schemas.management import AttendanceCreate, AttendanceUpdate, AttendanceOut

router = APIRouter()


@router.get("/", response_model=list[AttendanceOut])
async def list_attendance(
    worker_id: int | None = None,
    date: date_type | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """سجل الحضور — المدير يرى الكل، العامل يرى حضوره فقط"""
    query = select(Attendance)

    if current_user.role == UserRole.WORKER:
        query = query.where(Attendance.worker_id == current_user.id)
    elif current_user.role == UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="غير مصرّح لك")

    if worker_id and current_user.role == UserRole.ADMIN:
        query = query.where(Attendance.worker_id == worker_id)
    if date:
        query = query.where(Attendance.date == date)

    result = await db.execute(query.order_by(Attendance.date.desc()))
    return result.scalars().all()


@router.post("/", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
async def record_attendance(
    data: AttendanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.WORKER)),
):
    """تسجيل الحضور — العامل يسجّل حضوره، المدير يسجّل لأي عامل"""
    if current_user.role == UserRole.WORKER:
        data.worker_id = current_user.id

    # Prevent duplicate for same worker+date
    today = data.date or date_type.today()
    existing = await db.execute(
        select(Attendance).where(
            Attendance.worker_id == data.worker_id,
            Attendance.date == today,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="الحضور مسجّل مسبقاً لهذا اليوم")

    record = Attendance(
        worker_id=data.worker_id,
        date=today,
        check_in=data.check_in,
        status=data.status,
        notes=data.notes,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.patch("/{record_id}", response_model=AttendanceOut)
async def update_attendance(
    record_id: int,
    data: AttendanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.WORKER)),
):
    """تحديث سجل حضور (تسجيل خروج مثلاً)"""
    result = await db.execute(select(Attendance).where(Attendance.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="السجل غير موجود")

    if current_user.role == UserRole.WORKER and record.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="لا يمكنك تعديل سجل غيرك")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    await db.flush()
    await db.refresh(record)
    return record
