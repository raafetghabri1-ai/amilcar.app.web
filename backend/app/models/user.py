import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, Text, Numeric,
)
from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    WORKER = "worker"
    CLIENT = "client"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, values_callable=lambda e: [x.value for x in e]), nullable=False, default=UserRole.CLIENT)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(Text, nullable=True)
    # VIP — auto-granted after 5 completed visits
    is_vip = Column(Boolean, default=False)
    vip_discount_percent = Column(Integer, default=0)           # e.g. 10 = 10 %
    vip_since = Column(DateTime(timezone=True), nullable=True)
    # Worker-specific fields
    specialty = Column(String(100), nullable=True)   # التخصص
    salary = Column(Numeric(10, 3), nullable=True)   # الراتب TND
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
