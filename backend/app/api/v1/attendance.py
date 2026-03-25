from datetime import date as date_type, time as time_type, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, extract, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.attendance import Attendance
from app.models.booking import Booking, BookingStatus
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


# ════════════════════════════════════════════
#  WORKER SELF CHECK-IN / CHECK-OUT
# ════════════════════════════════════════════

@router.post("/checkin", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
async def worker_checkin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WORKER)),
):
    """تسجيل حضور العامل — يسجّل الوقت تلقائياً"""
    today = date_type.today()
    now = datetime.now(timezone.utc).time().replace(microsecond=0)

    existing = await db.execute(
        select(Attendance).where(
            Attendance.worker_id == current_user.id,
            Attendance.date == today,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="الحضور مسجّل مسبقاً لهذا اليوم")

    record = Attendance(
        worker_id=current_user.id,
        date=today,
        check_in=now,
        status="present",
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record


@router.post("/checkout", response_model=AttendanceOut)
async def worker_checkout(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WORKER)),
):
    """تسجيل انصراف العامل — يسجّل الوقت تلقائياً"""
    today = date_type.today()
    now = datetime.now(timezone.utc).time().replace(microsecond=0)

    result = await db.execute(
        select(Attendance).where(
            Attendance.worker_id == current_user.id,
            Attendance.date == today,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="لم تسجّل حضورك بعد اليوم")
    if record.check_out:
        raise HTTPException(status_code=409, detail="الانصراف مسجّل مسبقاً")

    record.check_out = now
    await db.flush()
    await db.refresh(record)
    return record


@router.get("/today", response_model=AttendanceOut | None)
async def worker_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WORKER)),
):
    """حالة حضور العامل اليوم"""
    result = await db.execute(
        select(Attendance).where(
            Attendance.worker_id == current_user.id,
            Attendance.date == date_type.today(),
        )
    )
    return result.scalar_one_or_none()


@router.get("/my-monthly", response_model=list[AttendanceOut])
async def worker_monthly(
    month: int = Query(default=None, ge=1, le=12),
    year: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WORKER)),
):
    """سجل الحضور الشهري للعامل"""
    today = date_type.today()
    m = month or today.month
    y = year or today.year

    result = await db.execute(
        select(Attendance)
        .where(
            Attendance.worker_id == current_user.id,
            extract("month", Attendance.date) == m,
            extract("year", Attendance.date) == y,
        )
        .order_by(Attendance.date.desc())
    )
    return result.scalars().all()


# ════════════════════════════════════════════
#  WORKER MONTHLY STATS
# ════════════════════════════════════════════

@router.get("/my-stats")
async def worker_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.WORKER)),
):
    """إحصائيات العامل الشهرية: سيارات منجزة + نقاط الأداء"""
    today = date_type.today()

    # Completed bookings this month
    result = await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.worker_id == current_user.id,
            Booking.status == BookingStatus.COMPLETED,
            extract("month", Booking.booking_date) == today.month,
            extract("year", Booking.booking_date) == today.year,
        )
    )
    completed_this_month = result.scalar() or 0

    # Total completed all time
    result2 = await db.execute(
        select(func.count()).select_from(Booking).where(
            Booking.worker_id == current_user.id,
            Booking.status == BookingStatus.COMPLETED,
        )
    )
    completed_total = result2.scalar() or 0

    # Attendance days this month
    result3 = await db.execute(
        select(func.count()).select_from(Attendance).where(
            Attendance.worker_id == current_user.id,
            extract("month", Attendance.date) == today.month,
            extract("year", Attendance.date) == today.year,
        )
    )
    attendance_days = result3.scalar() or 0

    # Performance points = completed bookings * 10 + attendance_days * 5
    performance_points = completed_this_month * 10 + attendance_days * 5

    return {
        "completed_this_month": completed_this_month,
        "completed_total": completed_total,
        "attendance_days": attendance_days,
        "performance_points": performance_points,
    }
