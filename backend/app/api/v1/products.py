from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_roles, get_current_user
from app.models.user import User, UserRole
from app.models.product import Product, Supplier, PurchaseLog
from app.schemas.management import (
    ProductCreate, ProductUpdate, ProductOut,
    SupplierCreate, SupplierUpdate, SupplierOut,
    PurchaseLogCreate, PurchaseLogOut,
)

router = APIRouter()


# ════════════════════════════════════════════
#  PRODUCTS
# ════════════════════════════════════════════

@router.get("/", response_model=list[ProductOut])
async def list_products(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """قائمة المنتجات"""
    query = select(Product)
    if not include_inactive:
        query = query.where(Product.is_active.is_(True))
    result = await db.execute(query.order_by(Product.category))
    return [ProductOut.from_product(p) for p in result.scalars().all()]


@router.get("/low-stock", response_model=list[ProductOut])
async def low_stock_products(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """المنتجات التي وصلت للحد الأدنى"""
    result = await db.execute(
        select(Product).where(
            Product.is_active.is_(True),
            Product.stock_quantity <= Product.min_stock_alert,
        )
    )
    return [ProductOut.from_product(p) for p in result.scalars().all()]


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """إضافة منتج — للمدير فقط"""
    product = Product(**data.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return ProductOut.from_product(product)


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    return ProductOut.from_product(product)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    await db.refresh(product)
    return ProductOut.from_product(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    await db.delete(product)


# ════════════════════════════════════════════
#  SUPPLIERS
# ════════════════════════════════════════════

@router.get("/suppliers/list", response_model=list[SupplierOut])
async def list_suppliers(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(
        select(Supplier).where(Supplier.is_active.is_(True)).order_by(Supplier.rating.desc())
    )
    return result.scalars().all()


@router.post("/suppliers", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    supplier = Supplier(**data.model_dump())
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return supplier


@router.patch("/suppliers/{supplier_id}", response_model=SupplierOut)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="المورّد غير موجود")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    await db.flush()
    await db.refresh(supplier)
    return supplier


@router.delete("/suppliers/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="المورّد غير موجود")
    await db.delete(supplier)


# ════════════════════════════════════════════
#  PURCHASE LOG
# ════════════════════════════════════════════

@router.get("/purchases/list", response_model=list[PurchaseLogOut])
async def list_purchases(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    result = await db.execute(
        select(PurchaseLog).order_by(PurchaseLog.purchased_at.desc()).limit(100)
    )
    logs = result.scalars().all()

    # Enrich with names
    out = []
    for log in logs:
        prod = await db.execute(select(Product.name).where(Product.id == log.product_id))
        sup_name = None
        if log.supplier_id:
            sup = await db.execute(select(Supplier.name).where(Supplier.id == log.supplier_id))
            sup_name = sup.scalar_one_or_none()
        out.append(PurchaseLogOut(
            id=log.id,
            product_id=log.product_id,
            supplier_id=log.supplier_id,
            quantity=log.quantity,
            unit_cost=log.unit_cost,
            total_cost=log.total_cost,
            notes=log.notes,
            purchased_at=log.purchased_at,
            product_name=prod.scalar_one_or_none(),
            supplier_name=sup_name,
        ))
    return out


@router.post("/purchases", response_model=PurchaseLogOut, status_code=status.HTTP_201_CREATED)
async def create_purchase(
    data: PurchaseLogCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    # Verify product exists
    prod_result = await db.execute(select(Product).where(Product.id == data.product_id))
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")

    total = data.quantity * data.unit_cost
    log = PurchaseLog(
        product_id=data.product_id,
        supplier_id=data.supplier_id,
        quantity=data.quantity,
        unit_cost=data.unit_cost,
        total_cost=total,
        notes=data.notes,
    )
    db.add(log)

    # Update product stock and cost_price
    product.stock_quantity += data.quantity
    product.cost_price = data.unit_cost

    await db.flush()
    await db.refresh(log)

    sup_name = None
    if log.supplier_id:
        sup = await db.execute(select(Supplier.name).where(Supplier.id == log.supplier_id))
        sup_name = sup.scalar_one_or_none()

    return PurchaseLogOut(
        id=log.id,
        product_id=log.product_id,
        supplier_id=log.supplier_id,
        quantity=log.quantity,
        unit_cost=log.unit_cost,
        total_cost=log.total_cost,
        notes=log.notes,
        purchased_at=log.purchased_at,
        product_name=product.name,
        supplier_name=sup_name,
    )
