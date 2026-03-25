from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles, hash_password
from app.models.user import User, UserRole
from app.models.attendance import Attendance, AttendanceStatus
from app.models.booking import Booking, BookingStatus
from app.models.service import Service, Vehicle
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.schemas.user import UserCreate, UserOut, UserUpdate, WorkerStats, ClientDetail

router = APIRouter()


@router.get("/", response_model=list[UserOut])
async def list_users(
    role: UserRole | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """قائمة المستخدمين — للمدير فقط"""
    query = select(User)
    if role:
        query = query.where(User.role == role)
    result = await db.execute(query.order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """إنشاء مستخدم (عامل/مدير) — للمدير فقط"""
    existing = await db.execute(
        select(User).where((User.email == data.email) | (User.phone == data.phone))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="المستخدم موجود مسبقاً")

    user = User(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        hashed_password=hash_password(data.password),
        role=data.role,
        specialty=data.specialty,
        salary=data.salary,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/workers/stats", response_model=list[WorkerStats])
async def get_workers_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """إحصائيات العمال — الحضور والأداء"""
    workers_result = await db.execute(
        select(User).where(User.role == UserRole.WORKER, User.is_active == True)
    )
    workers = workers_result.scalars().all()

    stats = []
    for w in workers:
        att_result = await db.execute(
            select(
                func.count(Attendance.id).label("total"),
                func.count(Attendance.id).filter(
                    Attendance.status == AttendanceStatus.PRESENT
                ).label("present"),
            ).where(Attendance.worker_id == w.id)
        )
        row = att_result.one()
        total_days = row.total
        present_days = row.present

        bookings_result = await db.execute(
            select(func.count(Booking.id)).where(
                Booking.worker_id == w.id,
                Booking.status == BookingStatus.COMPLETED,
            )
        )
        completed = bookings_result.scalar() or 0

        attendance_rate = (present_days / total_days * 100) if total_days > 0 else 0
        # Performance: 2 pts per completed booking + 1 pt per present day
        performance_points = completed * 2 + present_days

        stats.append(WorkerStats(
            worker_id=w.id,
            full_name=w.full_name,
            specialty=w.specialty,
            total_days=total_days,
            present_days=present_days,
            attendance_rate=round(attendance_rate, 1),
            completed_bookings=completed,
            performance_points=performance_points,
        ))
    return stats


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return user


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """حذف مستخدم — للمدير فقط"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="لا يمكن حذف حساب المدير")
    await db.delete(user)
    await db.flush()


# ════════════════════════════════════════════
#  CLIENTS — Full Details for Admin
# ════════════════════════════════════════════

@router.get("/clients/details", response_model=list[ClientDetail])
async def list_clients_details(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """All clients with vehicles, bookings, orders — for admin."""
    from decimal import Decimal

    clients_result = await db.execute(
        select(User).where(User.role == UserRole.CLIENT).order_by(User.created_at.desc())
    )
    clients = clients_result.scalars().all()

    result = []
    for c in clients:
        # vehicles
        vehs = (await db.execute(
            select(Vehicle).where(Vehicle.client_id == c.id)
        )).scalars().all()
        vehicles = [{"brand": v.brand, "model": v.model, "plate_number": v.plate_number, "year": v.year, "color": v.color} for v in vehs]

        # bookings (service history)
        bookings_result = await db.execute(
            select(Booking, Service)
            .join(Service, Booking.service_id == Service.id)
            .where(Booking.client_id == c.id)
            .order_by(Booking.booking_date.desc())
        )
        services_used = []
        total_spent = Decimal("0")
        total_visits = 0
        for b, svc in bookings_result.all():
            services_used.append({
                "service_name": svc.name,
                "service_name_ar": svc.name_ar,
                "date": str(b.booking_date),
                "status": b.status.value,
                "price": float(b.total_price),
            })
            if b.status == BookingStatus.COMPLETED:
                total_visits += 1
                if b.is_paid:
                    total_spent += b.total_price

        # orders (store purchases)
        orders_result = await db.execute(
            select(Order).where(Order.client_id == c.id).order_by(Order.created_at.desc())
        )
        orders_out = []
        for order in orders_result.scalars().all():
            items_result = await db.execute(
                select(OrderItem, Product)
                .join(Product, OrderItem.product_id == Product.id)
                .where(OrderItem.order_id == order.id)
            )
            items = [
                {"product_name": prod.name, "product_name_ar": prod.name_ar, "quantity": oi.quantity, "unit_price": float(oi.unit_price)}
                for oi, prod in items_result.all()
            ]
            orders_out.append({
                "id": order.id,
                "total_amount": float(order.total_amount),
                "created_at": order.created_at.isoformat(),
                "items": items,
            })

        result.append(ClientDetail(
            id=c.id,
            full_name=c.full_name,
            email=c.email,
            phone=c.phone,
            date_of_birth=c.date_of_birth,
            is_vip=c.is_vip,
            vip_discount_percent=c.vip_discount_percent or 0,
            vip_since=c.vip_since,
            created_at=c.created_at,
            vehicles=vehicles,
            total_visits=total_visits,
            total_spent=float(total_spent),
            services_used=services_used,
            orders=orders_out,
        ))

    return result
