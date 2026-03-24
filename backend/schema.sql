-- ============================================================
-- AMILCAR Auto Care — PostgreSQL Full Schema
-- محرس، صفاقس، تونس
-- ============================================================

-- ──── 1. المستخدمون ────
CREATE TYPE user_role AS ENUM ('admin', 'worker', 'client');

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(150)    NOT NULL,
    email           VARCHAR(255)    UNIQUE NOT NULL,
    phone           VARCHAR(20)     UNIQUE NOT NULL,
    hashed_password VARCHAR(255)    NOT NULL,
    role            user_role       NOT NULL DEFAULT 'client',
    is_active       BOOLEAN         DEFAULT TRUE,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ     DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role  ON users(role);

-- ──── 2. الخدمات ────
CREATE TYPE service_category AS ENUM (
    'wash', 'polish', 'ceramic', 'interior',
    'exterior', 'paint_protection', 'detailing', 'other'
);

CREATE TABLE services (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(200)      NOT NULL,
    name_ar           VARCHAR(200),
    description       TEXT,
    category          service_category  NOT NULL,
    price             NUMERIC(10,3)     NOT NULL,  -- TND (millimes)
    duration_minutes  INTEGER           NOT NULL,
    is_active         BOOLEAN           DEFAULT TRUE,
    image_url         TEXT,
    created_at        TIMESTAMPTZ       DEFAULT NOW()
);

-- ──── 3. السيارات ────
CREATE TABLE vehicles (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    brand        VARCHAR(100)   NOT NULL,
    model        VARCHAR(100)   NOT NULL,
    year         INTEGER,
    color        VARCHAR(50),
    plate_number VARCHAR(30)    UNIQUE NOT NULL,
    created_at   TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX idx_vehicles_client ON vehicles(client_id);

-- ──── 4. الحجوزات ────
CREATE TYPE booking_status AS ENUM (
    'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer');

CREATE TABLE bookings (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    vehicle_id      INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    worker_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    service_id      INTEGER REFERENCES services(id) ON DELETE CASCADE NOT NULL,
    booking_date    DATE             NOT NULL,
    booking_time    TIME             NOT NULL,
    status          booking_status   DEFAULT 'pending',
    total_price     NUMERIC(10,3)    NOT NULL,
    payment_method  payment_method,
    is_paid         BOOLEAN          DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ      DEFAULT NOW(),
    updated_at      TIMESTAMPTZ      DEFAULT NOW()
);

CREATE INDEX idx_bookings_client  ON bookings(client_id);
CREATE INDEX idx_bookings_worker  ON bookings(worker_id);
CREATE INDEX idx_bookings_date    ON bookings(booking_date);
CREATE INDEX idx_bookings_status  ON bookings(status);

-- ──── 5. المنتجات (المتجر) ────
CREATE TYPE product_category AS ENUM (
    'accessories', 'cleaning', 'protection', 'fragrance', 'tools', 'other'
);

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200)       NOT NULL,
    name_ar         VARCHAR(200),
    description     TEXT,
    category        product_category   NOT NULL,
    price           NUMERIC(10,3)      NOT NULL,
    cost_price      NUMERIC(10,3),
    stock_quantity  INTEGER            DEFAULT 0,
    min_stock_alert INTEGER            DEFAULT 5,
    sku             VARCHAR(50)        UNIQUE,
    image_url       TEXT,
    is_active       BOOLEAN            DEFAULT TRUE,
    created_at      TIMESTAMPTZ        DEFAULT NOW(),
    updated_at      TIMESTAMPTZ        DEFAULT NOW()
);

-- ──── 6. الطلبات ────
CREATE TABLE orders (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    total_amount  NUMERIC(10,3)  NOT NULL,
    created_at    TIMESTAMPTZ    DEFAULT NOW()
);

CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id  INTEGER REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    quantity    INTEGER         NOT NULL,
    unit_price  NUMERIC(10,3)  NOT NULL
);

-- ──── 7. الحضور والغياب ────
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'leave');

CREATE TABLE attendance (
    id         SERIAL PRIMARY KEY,
    worker_id  INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    date       DATE               NOT NULL DEFAULT CURRENT_DATE,
    check_in   TIME,
    check_out  TIME,
    status     attendance_status  DEFAULT 'present',
    notes      TEXT,
    created_at TIMESTAMPTZ        DEFAULT NOW(),
    UNIQUE(worker_id, date)
);

CREATE INDEX idx_attendance_worker ON attendance(worker_id);
CREATE INDEX idx_attendance_date   ON attendance(date);

-- ──── 8. الإيرادات ────
CREATE TYPE revenue_type AS ENUM ('service', 'product_sale', 'other');

CREATE TABLE revenues (
    id            SERIAL PRIMARY KEY,
    booking_id    INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    revenue_type  revenue_type     NOT NULL,
    amount        NUMERIC(10,3)    NOT NULL,
    description   TEXT,
    date          DATE             NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ      DEFAULT NOW()
);

CREATE INDEX idx_revenues_date ON revenues(date);

-- ──── 9. المصاريف ────
CREATE TYPE expense_category AS ENUM (
    'salary', 'rent', 'supplies', 'utilities', 'maintenance', 'other'
);

CREATE TABLE expenses (
    id          SERIAL PRIMARY KEY,
    category    expense_category  NOT NULL,
    amount      NUMERIC(10,3)     NOT NULL,
    description TEXT,
    date        DATE              NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ       DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(date);
