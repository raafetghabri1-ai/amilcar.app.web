import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, ForeignKey, DateTime, Numeric, Enum,
)
from app.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "pending"            # في الانتظار
    CONFIRMED = "confirmed"        # مؤكد
    READY = "ready"                # جاهز للاستلام
    COMPLETED = "completed"        # مكتمل (تم الاستلام)
    CANCELLED = "cancelled"        # ملغى


class Order(Base):
    """طلب شراء منتجات من المتجر"""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    total_amount = Column(Numeric(10, 3), nullable=False)
    status = Column(
        Enum(OrderStatus, values_callable=lambda e: [x.value for x in e]),
        default=OrderStatus.PENDING,
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 3), nullable=False)
