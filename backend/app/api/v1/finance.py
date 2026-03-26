from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.models.attendance import Revenue, Expense, RevenueType, ExpenseCategory
from app.models.booking import Booking, BookingStatus
from app.models.service import Service
from app.schemas.management import (
    RevenueCreate, RevenueOut, ExpenseCreate, ExpenseOut,
)

router = APIRouter()


# ──── Revenues ────
@router.get("/revenues", response_model=list[RevenueOut])
async def list_revenues(
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    query = select(Revenue)
    if start_date:
        query = query.where(Revenue.date >= start_date)
    if end_date:
        query = query.where(Revenue.date <= end_date)
    result = await db.execute(query.order_by(Revenue.date.desc()))
    return result.scalars().all()


@router.post("/revenues", response_model=RevenueOut, status_code=status.HTTP_201_CREATED)
async def create_revenue(
    data: RevenueCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    # Prevent duplicate revenue for same booking
    if data.booking_id:
        existing = (await db.execute(
            select(Revenue).where(Revenue.booking_id == data.booking_id)
        )).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Revenue already recorded for booking #{data.booking_id}",
            )

    revenue = Revenue(**data.model_dump(exclude_none=True))
    if not revenue.date:
        revenue.date = date_type.today()
    db.add(revenue)
    await db.flush()
    await db.refresh(revenue)
    return revenue


# ──── Expenses ────
@router.get("/expenses", response_model=list[ExpenseOut])
async def list_expenses(
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    query = select(Expense)
    if start_date:
        query = query.where(Expense.date >= start_date)
    if end_date:
        query = query.where(Expense.date <= end_date)
    result = await db.execute(query.order_by(Expense.date.desc()))
    return result.scalars().all()


@router.post("/expenses", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    expense = Expense(**data.model_dump(exclude_none=True))
    if not expense.date:
        expense.date = date_type.today()
    db.add(expense)
    await db.flush()
    await db.refresh(expense)
    return expense


# ──── Dashboard Summary ────
@router.get("/summary")
async def finance_summary(
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """ملخص مالي — مجموع الإيرادات والمصاريف والربح"""
    rev_query = select(func.coalesce(func.sum(Revenue.amount), 0))
    exp_query = select(func.coalesce(func.sum(Expense.amount), 0))

    if start_date:
        rev_query = rev_query.where(Revenue.date >= start_date)
        exp_query = exp_query.where(Expense.date >= start_date)
    if end_date:
        rev_query = rev_query.where(Revenue.date <= end_date)
        exp_query = exp_query.where(Expense.date <= end_date)

    total_revenue = (await db.execute(rev_query)).scalar()
    total_expense = (await db.execute(exp_query)).scalar()

    return {
        "total_revenue": float(total_revenue),
        "total_expense": float(total_expense),
        "net_profit": float(total_revenue - total_expense),
    }


# ──── Advanced Reports ────

@router.get("/report/monthly")
async def monthly_report(
    year: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """تقرير شهري — إيرادات ومصاريف وأرباح لكل شهر في السنة"""
    months = []
    for month in range(1, 13):
        rev = (await db.execute(
            select(func.coalesce(func.sum(Revenue.amount), 0))
            .where(extract("year", Revenue.date) == year)
            .where(extract("month", Revenue.date) == month)
        )).scalar()

        exp = (await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(extract("year", Expense.date) == year)
            .where(extract("month", Expense.date) == month)
        )).scalar()

        months.append({
            "month": month,
            "revenue": float(rev),
            "expense": float(exp),
            "profit": float(rev - exp),
        })

    return {"year": year, "months": months}


@router.get("/report/by-service")
async def revenue_by_service(
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """تقرير إيرادات حسب الخدمة"""
    query = (
        select(
            Service.id,
            Service.name,
            Service.name_ar,
            func.count(Booking.id).label("bookings_count"),
            func.coalesce(func.sum(Booking.total_price), 0).label("total_revenue"),
        )
        .join(Booking, Booking.service_id == Service.id)
        .where(Booking.status == BookingStatus.COMPLETED)
        .group_by(Service.id, Service.name, Service.name_ar)
        .order_by(func.sum(Booking.total_price).desc())
    )

    if start_date:
        query = query.where(Booking.booking_date >= start_date)
    if end_date:
        query = query.where(Booking.booking_date <= end_date)

    result = await db.execute(query)
    return [
        {
            "service_id": row.id,
            "service_name": row.name,
            "service_name_ar": row.name_ar,
            "bookings_count": row.bookings_count,
            "total_revenue": float(row.total_revenue),
        }
        for row in result.all()
    ]


@router.get("/report/by-expense-category")
async def expense_by_category(
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """تقرير مصاريف حسب الفئة"""
    query = (
        select(
            Expense.category,
            func.count(Expense.id).label("count"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
        )
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    )

    if start_date:
        query = query.where(Expense.date >= start_date)
    if end_date:
        query = query.where(Expense.date <= end_date)

    result = await db.execute(query)
    return [
        {
            "category": row.category.value,
            "count": row.count,
            "total": float(row.total),
        }
        for row in result.all()
    ]
