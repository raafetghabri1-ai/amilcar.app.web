import enum
from datetime import datetime, date as date_type, timezone
from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, Date, Numeric, Enum, Boolean, Text,
)
from app.core.database import Base
from app.models.booking import PaymentMethod


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
    payment_method = Column(Enum(PaymentMethod, values_callable=lambda e: [x.value for x in e]), nullable=True)
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 3), nullable=False)


class Invoice(Base):
    """فاتورة — تُنشأ تلقائياً عند إتمام حجز أو طلب"""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(30), unique=True, nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    client_name = Column(String(200), nullable=True)
    client_phone = Column(String(20), nullable=True)
    amount = Column(Numeric(10, 3), nullable=False)
    vat_amount = Column(Numeric(10, 3), default=0)
    total_amount = Column(Numeric(10, 3), nullable=False)
    payment_method = Column(Enum(PaymentMethod, values_callable=lambda e: [x.value for x in e]), nullable=True)
    is_paid = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    issue_date = Column(Date, nullable=False, default=lambda: date_type.today())
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
