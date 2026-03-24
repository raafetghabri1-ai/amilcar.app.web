import datetime as dt

from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.service import ServiceCategory
from app.models.booking import BookingStatus, PaymentMethod


# ──── Service ────
class ServiceCreate(BaseModel):
    name: str = Field(max_length=200)
    name_ar: str | None = None
    description: str | None = None
    category: ServiceCategory
    price: Decimal = Field(ge=0)
    duration_minutes: int = Field(ge=5)
    is_active: bool = True
    image_url: str | None = None


class ServiceOut(BaseModel):
    id: int
    name: str
    name_ar: str | None
    description: str | None
    category: ServiceCategory
    price: Decimal
    duration_minutes: int
    is_active: bool
    image_url: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# ──── Vehicle ────
class VehicleCreate(BaseModel):
    brand: str = Field(max_length=100)
    model: str = Field(max_length=100)
    year: int | None = None
    color: str | None = None
    plate_number: str = Field(max_length=30)


class VehicleOut(BaseModel):
    id: int
    client_id: int
    brand: str
    model: str
    year: int | None
    color: str | None
    plate_number: str
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# ──── Booking ────
class BookingCreate(BaseModel):
    vehicle_id: int | None = None
    service_id: int
    booking_date: dt.date
    booking_time: dt.time
    notes: str | None = None


class BookingUpdate(BaseModel):
    worker_id: int | None = None
    status: BookingStatus | None = None
    payment_method: PaymentMethod | None = None
    is_paid: bool | None = None
    notes: str | None = None


class BookingOut(BaseModel):
    id: int
    client_id: int
    vehicle_id: int | None
    worker_id: int | None
    service_id: int
    booking_date: dt.date
    booking_time: dt.time
    status: BookingStatus
    total_price: Decimal
    payment_method: PaymentMethod | None
    is_paid: bool
    notes: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# ──── Enriched Booking (with joined names) ────
class BookingDetail(BookingOut):
    client_name: str | None = None
    client_phone: str | None = None
    service_name: str | None = None
    service_name_ar: str | None = None
    service_duration: int | None = None
    vehicle_info: str | None = None
    worker_name: str | None = None
    is_vip: bool = False
    vip_discount_percent: int = 0
    original_price: Decimal | None = None


# ──── Client History ────
class ClientHistory(BaseModel):
    client_id: int
    full_name: str
    email: str
    phone: str
    is_vip: bool = False
    vip_discount_percent: int = 0
    vip_since: dt.datetime | None = None
    vehicles: list[VehicleOut] = []
    bookings: list[BookingDetail] = []
    total_spent: Decimal = Decimal("0")
    total_visits: int = 0
