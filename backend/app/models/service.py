import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, DateTime, Enum, ForeignKey, Boolean,
)
from app.core.database import Base


class ServiceCategory(str, enum.Enum):
    WASH = "wash"                    # غسيل
    POLISH = "polish"                # تلميع
    CERAMIC = "ceramic"              # سيراميك
    INTERIOR = "interior"            # تنظيف داخلي
    EXTERIOR = "exterior"            # تنظيف خارجي
    PAINT_PROTECTION = "paint_protection"  # حماية الطلاء
    DETAILING = "detailing"          # تفصيل
    OTHER = "other"


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(ServiceCategory, values_callable=lambda e: [x.value for x in e]), nullable=False)
    price = Column(Numeric(10, 3), nullable=False)  # TND with 3 decimals (millimes)
    duration_minutes = Column(Integer, nullable=False)  # مدة الخدمة بالدقائق
    is_active = Column(Boolean, default=True)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    brand = Column(String(100), nullable=False)      # الماركة
    model = Column(String(100), nullable=False)       # الموديل
    year = Column(Integer, nullable=True)
    color = Column(String(50), nullable=True)
    plate_number = Column(String(30), unique=True, nullable=False)  # رقم اللوحة
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
