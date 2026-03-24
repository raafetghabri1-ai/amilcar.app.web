import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, DateTime, Date, Time,
    Enum, ForeignKey, Boolean,
)
from app.core.database import Base


class BookingStatus(str, enum.Enum):
    PENDING = "pending"          # في الانتظار
    CONFIRMED = "confirmed"      # مؤكد
    IN_PROGRESS = "in_progress"  # قيد التنفيذ
    COMPLETED = "completed"      # مكتمل
    CANCELLED = "cancelled"      # ملغى


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    booking_date = Column(Date, nullable=False)
    booking_time = Column(Time, nullable=False)
    status = Column(Enum(BookingStatus, values_callable=lambda e: [x.value for x in e]), default=BookingStatus.PENDING)
    total_price = Column(Numeric(10, 3), nullable=False)
    payment_method = Column(Enum(PaymentMethod, values_callable=lambda e: [x.value for x in e]), nullable=True)
    is_paid = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
