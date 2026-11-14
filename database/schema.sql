-- LAAM Express | Full PostgreSQL schema (11 tables)
-- Run on a NEW EMPTY database, e.g. laam_express_dev.
-- IMPORTANT: do not run this file against the existing tracking database as a migration.
BEGIN;

-- Table 1 : customer
CREATE TABLE customer (
    customer_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    customer_type VARCHAR(50) NOT NULL DEFAULT 'General',
    CONSTRAINT chk_customer_type CHECK (customer_type IN ('General','Member','Business'))
);

-- Table 2 : coupon
CREATE TABLE coupon (
    coupon_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    coupon_code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(50) NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    CONSTRAINT chk_coupon_type CHECK (discount_type IN ('Fixed','Percentage')),
    CONSTRAINT chk_coupon_value CHECK (discount_value > 0 AND (discount_type <> 'Percentage' OR discount_value <= 100)),
    CONSTRAINT chk_coupon_dates CHECK (expiry_date >= start_date),
    CONSTRAINT chk_coupon_status CHECK (status IN ('Active','Inactive','Expired'))
);

-- Table 3 : branch
CREATE TABLE branch (
    branch_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20)
);

-- Table 4 : employee
CREATE TABLE employee (
    employee_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    branch_id INTEGER REFERENCES branch(branch_id)
);

-- Table 5 : orders
CREATE TABLE orders (
    order_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customer(customer_id),
    coupon_id INTEGER REFERENCES coupon(coupon_id),
    order_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sender_name VARCHAR(100),
    sender_phone VARCHAR(20),
    sender_address TEXT,
    receiver_name VARCHAR(100),
    receiver_phone VARCHAR(20),
    receiver_address TEXT,
    service_type VARCHAR(50),
    shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    order_status VARCHAR(50) NOT NULL DEFAULT 'Order Created',
    membership_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (membership_discount_amount >= 0)
);

-- Table 6 : parcel
CREATE TABLE parcel (
    parcel_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(order_id),
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    parcel_type VARCHAR(50),
    weight NUMERIC(10,2) CHECK (weight IS NULL OR weight > 0),
    length NUMERIC(10,2) CHECK (length IS NULL OR length > 0),
    width NUMERIC(10,2) CHECK (width IS NULL OR width > 0),
    height NUMERIC(10,2) CHECK (height IS NULL OR height > 0),
    destination_zone VARCHAR(100),
    special_handling VARCHAR(100),
    current_status VARCHAR(50) NOT NULL DEFAULT 'Order Created',
    storage_start_date DATE,
    return_status VARCHAR(50)
);

-- Table 7 : parcel_status_history
CREATE TABLE parcel_status_history (
    status_history_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parcel_id INTEGER NOT NULL REFERENCES parcel(parcel_id),
    employee_id INTEGER REFERENCES employee(employee_id),
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(255)
);

-- Table 8 : pickup
CREATE TABLE pickup (
    pickup_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id INTEGER REFERENCES employee(employee_id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    pickup_location TEXT,
    pickup_result VARCHAR(50),
    inspection_status VARCHAR(50)
);

-- One pickup can cover many orders; each order has at most one pickup.
ALTER TABLE orders ADD COLUMN pickup_id INTEGER REFERENCES pickup(pickup_id);

-- Table 9 : delivery
CREATE TABLE delivery (
    delivery_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parcel_id INTEGER NOT NULL REFERENCES parcel(parcel_id),
    employee_id INTEGER REFERENCES employee(employee_id),
    delivery_date TIMESTAMPTZ,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    proof_of_delivery TEXT,
    CONSTRAINT chk_delivery_proof CHECK (
        delivery_status <> 'Delivered'
        OR (proof_of_delivery IS NOT NULL AND btrim(proof_of_delivery) <> '')
    )
);

-- Table 10 : payment
CREATE TABLE payment (
    payment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    payment_method VARCHAR(50),
    payment_amount NUMERIC(10,2) NOT NULL CHECK (payment_amount >= 0),
    payment_date TIMESTAMPTZ,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending'
);

-- Table 11 : cod (Cash on Delivery)
CREATE TABLE cod (
    cod_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(order_id),
    cod_amount NUMERIC(10,2) NOT NULL CHECK (cod_amount >= 0),
    cod_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cod_fee >= 0),
    collected_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (collected_amount >= 0),
    collected_date TIMESTAMPTZ,
    settlement_date TIMESTAMPTZ,
    settlement_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    settlement_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (settlement_amount >= 0),
    CONSTRAINT chk_cod_settlement_dates CHECK (
        settlement_date IS NULL OR collected_date IS NULL OR settlement_date >= collected_date
    )
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_pickup ON orders(pickup_id);
CREATE INDEX idx_history_parcel_time ON parcel_status_history(parcel_id, timestamp);
CREATE INDEX idx_pickup_employee_date ON pickup(employee_id, appointment_date);
CREATE INDEX idx_delivery_parcel ON delivery(parcel_id);
CREATE INDEX idx_payment_order ON payment(order_id);
COMMIT;


