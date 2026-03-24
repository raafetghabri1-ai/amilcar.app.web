import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus
from app.models.service import Service, Vehicle
from app.schemas.service import (
    BookingCreate, BookingUpdate, BookingOut, BookingDetail,
    VehicleCreate, VehicleOut, ClientHistory,
)

router = APIRouter()

VIP_THRESHOLD = 5       # completed visits to earn VIP
VIP_DISCOUNT = 10       # 10 %


# ─── helpers ───

async def _check_vip_promotion(client_id: int, db: AsyncSession) -> None:
    """Promote a client to VIP if they reached the threshold."""
    client = (await db.execute(select(User).where(User.id == client_id))).scalar_one_or_none()
    if not client or client.is_vip:
        return

    count_result = await db.execute(
        select(func.count())
        .select_from(Booking)
        .where(Booking.client_id == client_id)
        .where(Booking.status == BookingStatus.COMPLETED)
    )
    completed = count_result.scalar() or 0

    if completed >= VIP_THRESHOLD:
        client.is_vip = True
        client.vip_discount_percent = VIP_DISCOUNT
        client.vip_since = dt.datetime.now(dt.timezone.utc)
        await db.flush()


async def _enrich_booking(b: Booking, db: AsyncSession) -> BookingDetail:
    """Attach joined names + VIP info to a booking."""
    data = {c.key: getattr(b, c.key) for c in b.__table__.columns}

    # client
    client = (await db.execute(select(User).where(User.id == b.client_id))).scalar_one_or_none()
    if client:
        data["client_name"] = client.full_name
        data["client_phone"] = client.phone
        data["is_vip"] = client.is_vip
        data["vip_discount_percent"] = client.vip_discount_percent or 0

    # service — also compute original_price when VIP discount was applied
    svc = (await db.execute(select(Service).where(Service.id == b.service_id))).scalar_one_or_none()
    if svc:
        data["service_name"] = svc.name
        data["service_name_ar"] = svc.name_ar
        data["service_duration"] = svc.duration_minutes
        # if total_price < service price it means discount was applied
        if client and client.is_vip and b.total_price < svc.price:
            data["original_price"] = svc.price

    # vehicle
    if b.vehicle_id:
        v = (await db.execute(select(Vehicle).where(Vehicle.id == b.vehicle_id))).scalar_one_or_none()
        if v:
            data["vehicle_info"] = f"{v.brand} {v.model} — {v.plate_number}"

    # worker
    if b.worker_id:
        w = (await db.execute(select(User).where(User.id == b.worker_id))).scalar_one_or_none()
        if w:
            data["worker_name"] = w.full_name

    return BookingDetail(**data)


# ════════════════════════════════════════════
#  BOOKINGS
# ════════════════════════════════════════════

@router.get("/", response_model=list[BookingDetail])
async def list_bookings(
    status_filter: BookingStatus | None = None,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List bookings with filters, enriched with names."""
    query = select(Booking)

    if current_user.role == UserRole.CLIENT:
        query = query.where(Booking.client_id == current_user.id)
    elif current_user.role == UserRole.WORKER:
        query = query.where(Booking.worker_id == current_user.id)

    if status_filter:
        query = query.where(Booking.status == status_filter)
    if date_from:
        query = query.where(Booking.booking_date >= date_from)
    if date_to:
        query = query.where(Booking.booking_date <= date_to)

    result = await db.execute(query.order_by(Booking.booking_date.desc(), Booking.booking_time))
    bookings = result.scalars().all()
    return [await _enrich_booking(b, db) for b in bookings]


@router.get("/calendar", response_model=list[BookingDetail])
async def calendar_bookings(
    date: dt.date = Query(..., description="Target date"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN, UserRole.WORKER)),
):
    """Get all bookings for a specific date (calendar view)."""
    result = await db.execute(
        select(Booking)
        .where(Booking.booking_date == date)
        .where(Booking.status != BookingStatus.CANCELLED)
        .order_by(Booking.booking_time)
    )
    return [await _enrich_booking(b, db) for b in result.scalars().all()]


@router.get("/check-slot")
async def check_time_slot(
    date: dt.date = Query(...),
    time: dt.time = Query(...),
    service_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Check if a time slot is available (returns conflict info)."""
    svc = (await db.execute(select(Service).where(Service.id == service_id))).scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    duration = svc.duration_minutes
    req_start = dt.datetime.combine(date, time)
    req_end = req_start + dt.timedelta(minutes=duration)

    # fetch all non-cancelled bookings on that date
    result = await db.execute(
        select(Booking, Service.duration_minutes)
        .join(Service, Booking.service_id == Service.id)
        .where(Booking.booking_date == date)
        .where(Booking.status != BookingStatus.CANCELLED)
    )

    for booking, bk_duration in result.all():
        bk_start = dt.datetime.combine(date, booking.booking_time)
        bk_end = bk_start + dt.timedelta(minutes=bk_duration)
        if req_start < bk_end and req_end > bk_start:
            return {"available": False, "conflict_time": str(booking.booking_time), "conflict_end": str(bk_end.time())}

    return {"available": True}


@router.post("/", response_model=BookingDetail, status_code=status.HTTP_201_CREATED)
async def create_booking(
    data: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a booking with conflict detection."""
    if current_user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create bookings")

    svc = (await db.execute(select(Service).where(Service.id == data.service_id))).scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    # ── conflict check ──
    duration = svc.duration_minutes
    req_start = dt.datetime.combine(data.booking_date, data.booking_time)
    req_end = req_start + dt.timedelta(minutes=duration)

    existing = await db.execute(
        select(Booking, Service.duration_minutes)
        .join(Service, Booking.service_id == Service.id)
        .where(Booking.booking_date == data.booking_date)
        .where(Booking.status != BookingStatus.CANCELLED)
    )
    for booking, bk_dur in existing.all():
        bk_start = dt.datetime.combine(data.booking_date, booking.booking_time)
        bk_end = bk_start + dt.timedelta(minutes=bk_dur)
        if req_start < bk_end and req_end > bk_start:
            raise HTTPException(
                status_code=409,
                detail=f"Time conflict with booking at {booking.booking_time}"
            )

    client_id = current_user.id if current_user.role == UserRole.CLIENT else current_user.id

    # ── VIP discount ──
    price = svc.price
    client = (await db.execute(select(User).where(User.id == client_id))).scalar_one_or_none()
    if client and client.is_vip and client.vip_discount_percent:
        price = svc.price * (100 - client.vip_discount_percent) / 100

    booking = Booking(
        client_id=client_id,
        vehicle_id=data.vehicle_id,
        service_id=data.service_id,
        booking_date=data.booking_date,
        booking_time=data.booking_time,
        total_price=price,
        notes=data.notes,
    )
    db.add(booking)
    await db.flush()
    await db.refresh(booking)
    return await _enrich_booking(booking, db)


@router.patch("/{booking_id}", response_model=BookingDetail)
async def update_booking(
    booking_id: int,
    data: BookingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.WORKER)),
):
    """Update booking status, assign worker, etc."""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role == UserRole.WORKER and booking.worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not assigned to you")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(booking, field, value)

    # ── auto-promote to VIP when booking completed ──
    if data.status == BookingStatus.COMPLETED:
        await _check_vip_promotion(booking.client_id, db)

    await db.flush()
    await db.refresh(booking)
    return await _enrich_booking(booking, db)


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a booking."""
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role == UserRole.CLIENT and booking.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")

    booking.status = BookingStatus.CANCELLED
    await db.flush()


# ════════════════════════════════════════════
#  VEHICLES
# ════════════════════════════════════════════

@router.get("/vehicles", response_model=list[VehicleOut])
async def list_vehicles(
    client_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List vehicles — clients see own, admins see all or by client_id."""
    query = select(Vehicle)
    if current_user.role == UserRole.CLIENT:
        query = query.where(Vehicle.client_id == current_user.id)
    elif client_id:
        query = query.where(Vehicle.client_id == client_id)
    result = await db.execute(query.order_by(Vehicle.created_at.desc()))
    return result.scalars().all()


@router.post("/vehicles", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    data: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a vehicle for the current client."""
    vehicle = Vehicle(client_id=current_user.id, **data.model_dump())
    db.add(vehicle)
    await db.flush()
    await db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if current_user.role == UserRole.CLIENT and vehicle.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your vehicle")
    await db.delete(vehicle)


# ════════════════════════════════════════════
#  CLIENT HISTORY
# ════════════════════════════════════════════

@router.get("/clients/{client_id}/history", response_model=ClientHistory)
async def client_history(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full client history: vehicles, bookings with service info, total spent."""
    if current_user.role == UserRole.CLIENT and current_user.id != client_id:
        raise HTTPException(status_code=403, detail="Access denied")

    client = (await db.execute(select(User).where(User.id == client_id))).scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # vehicles
    vehicles = (await db.execute(
        select(Vehicle).where(Vehicle.client_id == client_id)
    )).scalars().all()

    # bookings (enriched)
    bookings_result = await db.execute(
        select(Booking)
        .where(Booking.client_id == client_id)
        .order_by(Booking.booking_date.desc(), Booking.booking_time.desc())
    )
    bookings = [await _enrich_booking(b, db) for b in bookings_result.scalars().all()]

    total_spent = sum(
        (b.total_price for b in bookings if b.status == BookingStatus.COMPLETED and b.is_paid),
        Decimal("0"),
    )
    total_visits = sum(1 for b in bookings if b.status == BookingStatus.COMPLETED)

    return ClientHistory(
        client_id=client.id,
        full_name=client.full_name,
        email=client.email,
        phone=client.phone,
        is_vip=client.is_vip,
        vip_discount_percent=client.vip_discount_percent or 0,
        vip_since=client.vip_since,
        vehicles=[VehicleOut.model_validate(v) for v in vehicles],
        bookings=bookings,
        total_spent=total_spent,
        total_visits=total_visits,
    )
