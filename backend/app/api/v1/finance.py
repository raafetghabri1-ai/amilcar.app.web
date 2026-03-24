from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.models.attendance import Revenue, Expense
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
