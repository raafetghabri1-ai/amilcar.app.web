# 🚗 AMILCAR Auto Care — نظام إدارة متكامل

مركز عناية السيارات الفاخرة — محرس، صفاقس، تونس

## Stack التقني

| Layer      | Technology         |
| ---------- | ------------------ |
| Frontend   | Next.js + TypeScript |
| Backend    | FastAPI (Python)   |
| Database   | PostgreSQL 16      |
| Auth       | JWT (3 أدوار)      |
| Mobile     | Flutter (لاحقاً)   |

## الأدوار

| الدور   | الصلاحيات |
| ------- | --------- |
| `admin` | إدارة كاملة: مخزون، إيرادات، حضور/غياب، عمال، حرفاء، حجوزات، متجر |
| `worker`| تسجيل حضور، متابعة الحجوزات المسندة |
| `client`| حجز موعد، تصفح الخدمات، تصفح المتجر |

## هيكل المشروع

```
amilcar.app.web/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── schema.sql              # Full SQL schema reference
│   ├── .env / .env.example
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   └── app/
│       ├── main.py             # FastAPI entry point
│       ├── seed.py             # Admin seeder
│       ├── core/
│       │   ├── config.py       # Settings
│       │   ├── database.py     # Async SQLAlchemy
│       │   └── security.py     # JWT + password hashing + role guards
│       ├── models/
│       │   ├── user.py         # users table
│       │   ├── service.py      # services + vehicles
│       │   ├── booking.py      # bookings
│       │   ├── product.py      # products (المتجر)
│       │   ├── attendance.py   # attendance + revenues + expenses
│       │   └── order.py        # orders + order_items
│       ├── schemas/
│       │   ├── user.py         # Auth + User Pydantic schemas
│       │   ├── service.py      # Service + Vehicle + Booking schemas
│       │   └── management.py   # Product + Attendance + Finance schemas
│       └── api/v1/
│           ├── router.py       # Central router
│           ├── auth.py         # Register / Login / Me
│           ├── users.py        # CRUD users (admin)
│           ├── services.py     # CRUD services
│           ├── bookings.py     # CRUD bookings
│           ├── products.py     # CRUD products
│           ├── attendance.py   # Attendance tracking
│           └── finance.py      # Revenues / Expenses / Summary
└── frontend/                   # (Next.js — لاحقاً)
```

## التشغيل السريع

### 1. باستخدام Docker Compose

```bash
docker compose up -d
```

### 2. بدون Docker

```bash
# إنشاء قاعدة البيانات
createdb amilcar_db

# إعداد البيئة الافتراضية
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# نسخ ملف البيئة
cp .env.example .env

# تشغيل السيرفر
uvicorn app.main:app --reload

# إنشاء مستخدم مدير
python -m app.seed
```

### 3. الوصول

- **API Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### 4. بيانات الدخول الافتراضية

| البريد | كلمة المرور |
| ------ | ----------- |
| admin@amilcar.tn | admin123 |

> ⚠️ غيّر كلمة المرور و `SECRET_KEY` في الإنتاج!

## قاعدة البيانات — الجداول

| # | الجدول | الوصف |
|---|--------|-------|
| 1 | `users` | المستخدمون (مدير/عامل/حريف) |
| 2 | `services` | الخدمات المقدمة |
| 3 | `vehicles` | سيارات الحرفاء |
| 4 | `bookings` | الحجوزات |
| 5 | `products` | منتجات المتجر |
| 6 | `orders` | طلبات الشراء |
| 7 | `order_items` | تفاصيل الطلبات |
| 8 | `attendance` | سجل الحضور والغياب |
| 9 | `revenues` | الإيرادات |
| 10 | `expenses` | المصاريف |

## API Endpoints

| Method | Endpoint | وصف | الأدوار |
|--------|----------|------|---------|
| POST | `/api/v1/auth/register` | تسجيل حريف جديد | Public |
| POST | `/api/v1/auth/login` | تسجيل الدخول | Public |
| GET | `/api/v1/auth/me` | بيانات المستخدم الحالي | All |
| PUT | `/api/v1/auth/me/password` | تغيير كلمة المرور | All |
| GET | `/api/v1/users/` | قائمة المستخدمين | Admin |
| POST | `/api/v1/users/` | إنشاء مستخدم | Admin |
| GET/PATCH | `/api/v1/users/{id}` | تفاصيل/تحديث مستخدم | Admin |
| GET | `/api/v1/services/` | قائمة الخدمات | Public |
| POST | `/api/v1/services/` | إضافة خدمة | Admin |
| GET/PATCH/DELETE | `/api/v1/services/{id}` | تفاصيل/تحديث/حذف خدمة | Admin |
| GET | `/api/v1/bookings/` | قائمة الحجوزات | All (filtered) |
| POST | `/api/v1/bookings/` | حجز جديد | Client, Admin |
| PATCH | `/api/v1/bookings/{id}` | تحديث حجز | Admin, Worker |
| DELETE | `/api/v1/bookings/{id}` | إلغاء حجز | All (own) |
| GET | `/api/v1/products/` | قائمة المنتجات | Public |
| POST | `/api/v1/products/` | إضافة منتج | Admin |
| GET/PATCH/DELETE | `/api/v1/products/{id}` | تفاصيل/تحديث/حذف منتج | Admin |
| GET | `/api/v1/attendance/` | سجل الحضور | Admin, Worker |
| POST | `/api/v1/attendance/` | تسجيل حضور | Admin, Worker |
| PATCH | `/api/v1/attendance/{id}` | تحديث (خروج) | Admin, Worker |
| GET | `/api/v1/finance/revenues` | الإيرادات | Admin |
| POST | `/api/v1/finance/revenues` | إضافة إيراد | Admin |
| GET | `/api/v1/finance/expenses` | المصاريف | Admin |
| POST | `/api/v1/finance/expenses` | إضافة مصروف | Admin |
| GET | `/api/v1/finance/summary` | ملخص مالي | Admin |
