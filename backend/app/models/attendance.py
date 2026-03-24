import enum
from datetime import datetime, date as date_type, timezone
from sqlalchemy import (
    Column, Integer, DateTime, Date, Time, Enum, ForeignKey, Text, Numeric,
)
from app.core.database import Base


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"      # حاضر
    ABSENT = "absent"        # غائب
    LATE = "late"            # متأخر
    LEAVE = "leave"          # إجازة


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, default=lambda: date_type.today())
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    status = Column(Enum(AttendanceStatus, values_callable=lambda e: [x.value for x in e]), default=AttendanceStatus.PRESENT)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RevenueType(str, enum.Enum):
    SERVICE = "service"          # إيراد خدمة
    PRODUCT_SALE = "product_sale"  # بيع منتج
    OTHER = "other"


class ExpenseCategory(str, enum.Enum):
    SALARY = "salary"
    RENT = "rent"
    SUPPLIES = "supplies"
    UTILITIES = "utilities"
    MAINTENANCE = "maintenance"
    OTHER = "other"


class Revenue(Base):
    __tablename__ = "revenues"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    revenue_type = Column(Enum(RevenueType, values_callable=lambda e: [x.value for x in e]), nullable=False)
    amount = Column(Numeric(10, 3), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=lambda: date_type.today())
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(Enum(ExpenseCategory, values_callable=lambda e: [x.value for x in e]), nullable=False)
    amount = Column(Numeric(10, 3), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(Date, nullable=False, default=lambda: date_type.today())
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
