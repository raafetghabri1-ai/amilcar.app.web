from fastapi import APIRouter

from app.api.v1 import auth, users, services, bookings, products, attendance, finance, orders, devices

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["المصادقة - Auth"])
router.include_router(users.router, prefix="/users", tags=["المستخدمون - Users"])
router.include_router(services.router, prefix="/services", tags=["الخدمات - Services"])
router.include_router(bookings.router, prefix="/bookings", tags=["الحجوزات - Bookings"])
router.include_router(products.router, prefix="/products", tags=["المتجر - Products"])
router.include_router(orders.router, prefix="/orders", tags=["الطلبات - Orders"])
router.include_router(devices.router, prefix="/devices", tags=["الأجهزة - Devices"])
router.include_router(attendance.router, prefix="/attendance", tags=["الحضور - Attendance"])
router.include_router(finance.router, prefix="/finance", tags=["المالية - Finance"])
