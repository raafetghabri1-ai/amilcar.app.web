"""Client-facing store orders API."""
import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.services.notification_service import notification_service

router = APIRouter()


# ─── Schemas ───

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


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
    client_name: str | None = None
    total_amount: Decimal
    status: OrderStatus
    created_at: dt.datetime
    updated_at: dt.datetime | None = None
    items: list[OrderItemOut] = []

    model_config = {"from_attributes": True}


# ─── Helpers ───

async def _enrich_order(order: Order, db: AsyncSession) -> OrderOut:
    """Build OrderOut with items and client name."""
    client = (await db.execute(select(User).where(User.id == order.client_id))).scalar_one_or_none()

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

    return OrderOut(
        id=order.id,
        client_id=order.client_id,
        client_name=client.full_name if client else None,
        total_amount=order.total_amount,
        status=order.status,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=items,
    )


async def _send_order_notification(db: AsyncSession, order: Order, new_status: OrderStatus) -> None:
    messages = {
        OrderStatus.CONFIRMED: {"title": "تأكيد الطلب ✅", "body": "تم تأكيد طلبك وجاري تحضيره"},
        OrderStatus.READY: {"title": "طلبك جاهز 📦", "body": "طلبك جاهز للاستلام من المركز"},
        OrderStatus.COMPLETED: {"title": "تم استلام الطلب ✦", "body": "شكرًا لك! تم تسليم طلبك بنجاح"},
        OrderStatus.CANCELLED: {"title": "إلغاء الطلب ❌", "body": "تم إلغاء طلبك"},
    }
    payload = messages.get(new_status)
    if not payload:
        return
    try:
        await notification_service.send_to_client(
            db, order.client_id,
            title=payload["title"], body=payload["body"],
            data={"type": "order_status", "order_id": str(order.id), "status": new_status.value},
        )
    except Exception:
        pass


# ─── Endpoints ───

@router.get("/", response_model=list[OrderOut])
async def list_orders(
    status_filter: OrderStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List orders — clients see own, admins see all."""
    query = select(Order)
    if current_user.role == UserRole.CLIENT:
        query = query.where(Order.client_id == current_user.id)
    if status_filter:
        query = query.where(Order.status == status_filter)

    result = await db.execute(query.order_by(Order.created_at.desc()))
    orders = result.scalars().all()
    return [await _enrich_order(o, db) for o in orders]


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

    for product_id, quantity, unit_price in validated_items:
        oi = OrderItem(order_id=order.id, product_id=product_id, quantity=quantity, unit_price=unit_price)
        db.add(oi)
        await db.flush()

        # reduce stock
        prod = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
        if prod:
            prod.stock_quantity -= quantity
            await db.flush()

    return await _enrich_order(order, db)


@router.patch("/{order_id}", response_model=OrderOut)
async def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Update order status (admin only)."""
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot update a cancelled order")
    if order.status == OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot update a completed order")

    order.status = data.status
    await db.flush()
    await db.refresh(order)
    await _send_order_notification(db, order, data.status)
    return await _enrich_order(order, db)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel an order — clients can cancel own pending orders, admin can cancel any."""
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if current_user.role == UserRole.CLIENT:
        if order.client_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your order")
        if order.status != OrderStatus.PENDING:
            raise HTTPException(status_code=400, detail="Can only cancel pending orders")

    if order.status in (OrderStatus.COMPLETED, OrderStatus.CANCELLED):
        raise HTTPException(status_code=400, detail="Order already completed or cancelled")

    # Restore stock
    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id))
    for item in items_result.scalars().all():
        prod = (await db.execute(select(Product).where(Product.id == item.product_id))).scalar_one_or_none()
        if prod:
            prod.stock_quantity += item.quantity

    order.status = OrderStatus.CANCELLED
    await db.flush()
    await _send_order_notification(db, order, OrderStatus.CANCELLED)
