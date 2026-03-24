import datetime as dt

from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.product import ProductCategory, ProductUnit
from app.models.attendance import AttendanceStatus, ExpenseCategory, RevenueType


# ──── Product ────
class ProductCreate(BaseModel):
    name: str = Field(max_length=200)
    name_ar: str | None = None
    description: str | None = None
    category: ProductCategory
    price: Decimal = Field(ge=0)
    cost_price: Decimal | None = None
    unit: ProductUnit = ProductUnit.PIECE
    stock_quantity: Decimal = Decimal("0")
    min_stock_alert: Decimal = Decimal("5")
    consumption_per_car: Decimal | None = None
    sku: str | None = None
    image_url: str | None = None
    service_id: int | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    name_ar: str | None = None
    description: str | None = None
    category: ProductCategory | None = None
    price: Decimal | None = None
    cost_price: Decimal | None = None
    unit: ProductUnit | None = None
    stock_quantity: Decimal | None = None
    min_stock_alert: Decimal | None = None
    consumption_per_car: Decimal | None = None
    is_active: bool | None = None
    service_id: int | None = None


class ProductOut(BaseModel):
    id: int
    name: str
    name_ar: str | None
    description: str | None
    category: ProductCategory
    price: Decimal
    cost_price: Decimal | None
    unit: ProductUnit
    stock_quantity: Decimal
    min_stock_alert: Decimal
    consumption_per_car: Decimal | None
    cars_estimate: int | None = None
    sku: str | None
    image_url: str | None
    is_active: bool
    service_id: int | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_product(cls, p: "Product") -> "ProductOut":
        data = {c.key: getattr(p, c.key) for c in p.__table__.columns}
        if p.consumption_per_car and p.consumption_per_car > 0:
            data["cars_estimate"] = int(p.stock_quantity / p.consumption_per_car)
        return cls(**data)


# ──── Supplier ────
class SupplierCreate(BaseModel):
    name: str = Field(max_length=200)
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    rating: int = Field(default=3, ge=1, le=5)
    notes: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    notes: str | None = None
    is_active: bool | None = None


class SupplierOut(BaseModel):
    id: int
    name: str
    phone: str | None
    email: str | None
    address: str | None
    rating: int
    notes: str | None
    is_active: bool
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# ──── Purchase Log ────
class PurchaseLogCreate(BaseModel):
    product_id: int
    supplier_id: int | None = None
    quantity: Decimal = Field(ge=0)
    unit_cost: Decimal = Field(ge=0)
    notes: str | None = None


class PurchaseLogOut(BaseModel):
    id: int
    product_id: int
    supplier_id: int | None
    quantity: Decimal
    unit_cost: Decimal
    total_cost: Decimal
    notes: str | None
    purchased_at: dt.datetime
    # joined fields
    product_name: str | None = None
    supplier_name: str | None = None

    model_config = {"from_attributes": True}


# ──── Attendance ────
class AttendanceCreate(BaseModel):
    worker_id: int
    date: dt.date | None = None
    check_in: dt.time | None = None
    status: AttendanceStatus = AttendanceStatus.PRESENT
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    check_out: dt.time | None = None
    status: AttendanceStatus | None = None
    notes: str | None = None


class AttendanceOut(BaseModel):
    id: int
    worker_id: int
    date: dt.date
    check_in: dt.time | None
    check_out: dt.time | None
    status: AttendanceStatus
    notes: str | None
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# ──── Revenue ────
class RevenueCreate(BaseModel):
    booking_id: int | None = None
    revenue_type: RevenueType
    amount: Decimal = Field(ge=0)
    description: str | None = None
    date: dt.date | None = None


class RevenueOut(BaseModel):
    id: int
    booking_id: int | None
    revenue_type: RevenueType
    amount: Decimal
    description: str | None
    date: dt.date
    created_at: dt.datetime

    model_config = {"from_attributes": True}


# ──── Expense ────
class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    amount: Decimal = Field(ge=0)
    description: str | None = None
    date: dt.date | None = None


class ExpenseOut(BaseModel):
    id: int
    category: ExpenseCategory
    amount: Decimal
    description: str | None
    date: dt.date
    created_at: dt.datetime

    model_config = {"from_attributes": True}
