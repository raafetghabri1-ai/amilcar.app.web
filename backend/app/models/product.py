import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Numeric, DateTime, Enum, Boolean, ForeignKey,
)
from app.core.database import Base


class ProductCategory(str, enum.Enum):
    ACCESSORIES = "accessories"      # اكسسوارات
    CLEANING = "cleaning"            # منتجات تنظيف
    PROTECTION = "protection"        # منتجات حماية
    FRAGRANCE = "fragrance"          # معطرات
    POLISH = "polish"                # ملمع
    MOISTURIZER = "moisturizer"      # مرطب
    RESTORER = "restorer"            # مجدد
    TOOLS = "tools"                  # أدوات
    OTHER = "other"


class ProductUnit(str, enum.Enum):
    PIECE = "piece"   # قطعة
    ML = "ml"         # مليلتر
    LITER = "liter"   # لتر
    KG = "kg"         # كيلوغرام
    GRAM = "gram"     # غرام


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(ProductCategory, values_callable=lambda e: [x.value for x in e]), nullable=False)
    price = Column(Numeric(10, 3), nullable=False)
    cost_price = Column(Numeric(10, 3), nullable=True)  # سعر الشراء
    unit = Column(Enum(ProductUnit, values_callable=lambda e: [x.value for x in e]), default=ProductUnit.PIECE, nullable=False)
    stock_quantity = Column(Numeric(10, 2), default=0)
    min_stock_alert = Column(Numeric(10, 2), default=5)  # تنبيه المخزون المنخفض
    consumption_per_car = Column(Numeric(10, 2), nullable=True)  # معدل الاستهلاك لكل سيارة
    sku = Column(String(50), unique=True, nullable=True)
    image_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    rating = Column(Integer, default=3)  # 1-5 stars
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PurchaseLog(Base):
    __tablename__ = "purchase_logs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit_cost = Column(Numeric(10, 3), nullable=False)
    total_cost = Column(Numeric(10, 3), nullable=False)
    notes = Column(Text, nullable=True)
    purchased_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
