"""Client-facing store orders API."""
import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order, OrderItem

router = APIRouter()


# ─── Schemas ───

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str | None = None
    product_name_ar: str | None = None
    quantity: int
    unit_price: Decimal

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    client_id: int
    total_amount: Decimal
    created_at: dt.datetime
    items: list[OrderItemOut] = []

    model_config = {"from_attributes": True}


# ─── Endpoints ───

@router.get("/", response_model=list[OrderOut])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List orders — clients see own, admins see all."""
    query = select(Order)
    if current_user.role == UserRole.CLIENT:
        query = query.where(Order.client_id == current_user.id)
    result = await db.execute(query.order_by(Order.created_at.desc()))
    orders = result.scalars().all()

    out = []
    for order in orders:
        items_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = []
        for item in items_result.scalars().all():
            prod = (await db.execute(select(Product).where(Product.id == item.product_id))).scalar_one_or_none()
            items.append(OrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=prod.name if prod else None,
                product_name_ar=prod.name_ar if prod else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
            ))
        out.append(OrderOut(
            id=order.id,
            client_id=order.client_id,
            total_amount=order.total_amount,
            created_at=order.created_at,
            items=items,
        ))
    return out


@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an order (client picks up products at next visit)."""
    if current_user.role not in (UserRole.CLIENT, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only clients can place orders")

    total = Decimal("0")
    validated_items: list[tuple[int, int, Decimal]] = []

    for item in data.items:
        prod = (await db.execute(select(Product).where(Product.id == item.product_id))).scalar_one_or_none()
        if not prod or not prod.is_active:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if prod.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {prod.name}")
        validated_items.append((item.product_id, item.quantity, prod.price))
        total += prod.price * item.quantity

    order = Order(client_id=current_user.id, total_amount=total)
    db.add(order)
    await db.flush()
    await db.refresh(order)

    items_out = []
    for product_id, quantity, unit_price in validated_items:
        oi = OrderItem(order_id=order.id, product_id=product_id, quantity=quantity, unit_price=unit_price)
        db.add(oi)
        await db.flush()
        await db.refresh(oi)

        # reduce stock
        prod = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
        if prod:
            prod.stock_quantity -= quantity
            await db.flush()

        items_out.append(OrderItemOut(
            id=oi.id,
            product_id=oi.product_id,
            product_name=prod.name if prod else None,
            product_name_ar=prod.name_ar if prod else None,
            quantity=oi.quantity,
            unit_price=oi.unit_price,
        ))

    return OrderOut(
        id=order.id,
        client_id=order.client_id,
        total_amount=order.total_amount,
        created_at=order.created_at,
        items=items_out,
    )
