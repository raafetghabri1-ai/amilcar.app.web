"""Invoice management API — auto-generation & PDF download."""
import io
import datetime as dt
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus, PaymentMethod
from app.models.order import Order, OrderItem, OrderStatus, Invoice
from app.models.product import Product
from app.models.service import Service

router = APIRouter()

VAT_RATE = Decimal("0.19")  # TVA 19% Tunisia


# ─── Schemas ───

class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    booking_id: int | None
    order_id: int | None
    client_id: int
    client_name: str | None
    client_phone: str | None
    amount: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    payment_method: PaymentMethod | None
    is_paid: bool
    notes: str | None
    issue_date: dt.date
    created_at: dt.datetime

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    booking_id: int | None = None
    order_id: int | None = None
    notes: str | None = None


# ─── Helpers ───

async def _next_invoice_number(db: AsyncSession) -> str:
    """Generate INV-YYYYMM-XXXX sequential number."""
    prefix = f"INV-{dt.date.today().strftime('%Y%m')}-"
    result = await db.execute(
        select(func.count(Invoice.id))
        .where(Invoice.invoice_number.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


async def _build_invoice_from_booking(
    booking: Booking, db: AsyncSession
) -> dict:
    """Extract invoice data from a completed booking."""
    client = (await db.execute(
        select(User).where(User.id == booking.client_id)
    )).scalar_one_or_none()

    amount = booking.total_price
    vat = (amount * VAT_RATE).quantize(Decimal("0.001"))
    total = amount + vat

    return {
        "booking_id": booking.id,
        "order_id": None,
        "client_id": booking.client_id,
        "client_name": client.full_name if client else None,
        "client_phone": client.phone if client else None,
        "amount": amount,
        "vat_amount": vat,
        "total_amount": total,
        "payment_method": booking.payment_method,
        "is_paid": booking.is_paid,
    }


async def _build_invoice_from_order(
    order: Order, db: AsyncSession
) -> dict:
    """Extract invoice data from a completed order."""
    client = (await db.execute(
        select(User).where(User.id == order.client_id)
    )).scalar_one_or_none()

    amount = order.total_amount
    vat = (amount * VAT_RATE).quantize(Decimal("0.001"))
    total = amount + vat

    return {
        "booking_id": None,
        "order_id": order.id,
        "client_id": order.client_id,
        "client_name": client.full_name if client else None,
        "client_phone": client.phone if client else None,
        "amount": amount,
        "vat_amount": vat,
        "total_amount": total,
        "payment_method": order.payment_method,
        "is_paid": order.is_paid,
    }


def _generate_pdf(invoice: Invoice, items_lines: list[dict]) -> io.BytesIO:
    """Generate a simple invoice PDF using reportlab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # ─── Header ───
    c.setFont("Helvetica-Bold", 20)
    c.drawString(30, h - 50, "AMILCAR Auto Care")
    c.setFont("Helvetica", 10)
    c.drawString(30, h - 68, "Mahres, Sfax — Tunisie")
    c.drawString(30, h - 80, "Tel: +216 97 038 792")

    # ─── Invoice info ───
    c.setFont("Helvetica-Bold", 14)
    c.drawString(30, h - 120, f"FACTURE  {invoice.invoice_number}")
    c.setFont("Helvetica", 10)
    c.drawString(30, h - 140, f"Date: {invoice.issue_date.strftime('%d/%m/%Y')}")
    c.drawString(30, h - 155, f"Client: {invoice.client_name or '—'}")
    c.drawString(30, h - 170, f"Tel: {invoice.client_phone or '—'}")

    payment_labels = {"cash": "Espèces", "card": "Carte", "bank_transfer": "Virement"}
    pm = payment_labels.get(invoice.payment_method.value, "—") if invoice.payment_method else "—"
    paid_label = "Payé" if invoice.is_paid else "Non payé"
    c.drawString(350, h - 140, f"Paiement: {pm}")
    c.drawString(350, h - 155, f"Statut: {paid_label}")

    # ─── Table header ───
    y = h - 210
    c.setFont("Helvetica-Bold", 10)
    c.drawString(30, y, "Description")
    c.drawString(300, y, "Qté")
    c.drawString(370, y, "Prix unit.")
    c.drawString(460, y, "Total")
    y -= 5
    c.line(30, y, 560, y)
    y -= 15

    # ─── Items ───
    c.setFont("Helvetica", 10)
    for item in items_lines:
        c.drawString(30, y, str(item.get("name", "—"))[:40])
        c.drawString(300, y, str(item.get("quantity", 1)))
        c.drawString(370, y, f"{item.get('unit_price', 0):.3f}")
        c.drawString(460, y, f"{item.get('total', 0):.3f}")
        y -= 18
        if y < 100:
            c.showPage()
            y = h - 50

    # ─── Totals ───
    y -= 10
    c.line(30, y, 560, y)
    y -= 20
    c.setFont("Helvetica", 11)
    c.drawString(350, y, f"Sous-total:")
    c.drawString(460, y, f"{float(invoice.amount):.3f} TND")
    y -= 18
    c.drawString(350, y, f"TVA (19%):")
    c.drawString(460, y, f"{float(invoice.vat_amount):.3f} TND")
    y -= 18
    c.setFont("Helvetica-Bold", 12)
    c.drawString(350, y, f"TOTAL:")
    c.drawString(460, y, f"{float(invoice.total_amount):.3f} TND")

    # ─── Footer ───
    c.setFont("Helvetica", 8)
    c.drawString(30, 30, "AMILCAR Auto Care — Mahres, Sfax — amilcarautocare@gmail.com")

    c.save()
    buf.seek(0)
    return buf


# ─── Endpoints ───

@router.get("/", response_model=list[InvoiceOut])
async def list_invoices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List invoices — clients see own, admins see all."""
    query = select(Invoice)
    if current_user.role == UserRole.CLIENT:
        query = query.where(Invoice.client_id == current_user.id)
    result = await db.execute(query.order_by(Invoice.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Create invoice from a booking or order (admin only)."""
    if not data.booking_id and not data.order_id:
        raise HTTPException(400, "Either booking_id or order_id required")

    # Prevent duplicate
    existing_q = select(Invoice)
    if data.booking_id:
        existing_q = existing_q.where(Invoice.booking_id == data.booking_id)
    else:
        existing_q = existing_q.where(Invoice.order_id == data.order_id)
    existing = (await db.execute(existing_q)).scalar_one_or_none()
    if existing:
        raise HTTPException(409, f"Invoice already exists: {existing.invoice_number}")

    if data.booking_id:
        booking = (await db.execute(
            select(Booking).where(Booking.id == data.booking_id)
        )).scalar_one_or_none()
        if not booking:
            raise HTTPException(404, "Booking not found")
        inv_data = await _build_invoice_from_booking(booking, db)
    else:
        order = (await db.execute(
            select(Order).where(Order.id == data.order_id)
        )).scalar_one_or_none()
        if not order:
            raise HTTPException(404, "Order not found")
        inv_data = await _build_invoice_from_order(order, db)

    inv = Invoice(
        invoice_number=await _next_invoice_number(db),
        notes=data.notes,
        **inv_data,
    )
    db.add(inv)
    await db.flush()
    await db.refresh(inv)
    return inv


@router.get("/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get single invoice."""
    inv = (await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )).scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if current_user.role == UserRole.CLIENT and inv.client_id != current_user.id:
        raise HTTPException(403, "Access denied")
    return inv


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download invoice as PDF."""
    inv = (await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )).scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if current_user.role == UserRole.CLIENT and inv.client_id != current_user.id:
        raise HTTPException(403, "Access denied")

    # Build line items
    items_lines: list[dict] = []

    if inv.booking_id:
        booking = (await db.execute(
            select(Booking).where(Booking.id == inv.booking_id)
        )).scalar_one_or_none()
        if booking:
            svc = (await db.execute(
                select(Service).where(Service.id == booking.service_id)
            )).scalar_one_or_none()
            items_lines.append({
                "name": svc.name if svc else f"Service #{booking.service_id}",
                "quantity": 1,
                "unit_price": float(booking.total_price),
                "total": float(booking.total_price),
            })

    if inv.order_id:
        oi_result = await db.execute(
            select(OrderItem).where(OrderItem.order_id == inv.order_id)
        )
        for oi in oi_result.scalars().all():
            prod = (await db.execute(
                select(Product).where(Product.id == oi.product_id)
            )).scalar_one_or_none()
            items_lines.append({
                "name": prod.name if prod else f"Product #{oi.product_id}",
                "quantity": oi.quantity,
                "unit_price": float(oi.unit_price),
                "total": float(oi.unit_price * oi.quantity),
            })

    buf = _generate_pdf(inv, items_lines)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{inv.invoice_number}.pdf"'},
    )


@router.post("/auto-generate/booking/{booking_id}", response_model=InvoiceOut)
async def auto_generate_booking_invoice(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Auto-generate invoice for a completed booking."""
    booking = (await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )).scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(400, "Booking must be completed first")

    # Check existing
    existing = (await db.execute(
        select(Invoice).where(Invoice.booking_id == booking_id)
    )).scalar_one_or_none()
    if existing:
        return existing

    inv_data = await _build_invoice_from_booking(booking, db)
    inv = Invoice(invoice_number=await _next_invoice_number(db), **inv_data)
    db.add(inv)
    await db.flush()
    await db.refresh(inv)
    return inv


@router.post("/auto-generate/order/{order_id}", response_model=InvoiceOut)
async def auto_generate_order_invoice(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Auto-generate invoice for a completed order."""
    order = (await db.execute(
        select(Order).where(Order.id == order_id)
    )).scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(400, "Order must be completed first")

    existing = (await db.execute(
        select(Invoice).where(Invoice.order_id == order_id)
    )).scalar_one_or_none()
    if existing:
        return existing

    inv_data = await _build_invoice_from_order(order, db)
    inv = Invoice(invoice_number=await _next_invoice_number(db), **inv_data)
    db.add(inv)
    await db.flush()
    await db.refresh(inv)
    return inv
