
-- ============================================================
-- LAAM Express | Database Schema
-- PostgreSQL: 11 tables, constraints, functions, and triggers.
-- Use for new database setup only.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CUSTOMER
-- ============================================================

CREATE TABLE customer (
    customer_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    customer_type VARCHAR(50) NOT NULL DEFAULT 'General',
    CONSTRAINT chk_customer_type
        CHECK (customer_type IN ('General', 'Member', 'Business'))
);

-- ============================================================
-- 2. COUPON
-- ============================================================

CREATE TABLE coupon (
    coupon_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    coupon_code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(50) NOT NULL,
    discount_value NUMERIC(10,2) NOT NULL,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',

    CONSTRAINT chk_coupon_type
        CHECK (discount_type IN ('Fixed', 'Percentage')),

    CONSTRAINT chk_coupon_value
        CHECK (
            discount_value > 0
            AND (
                discount_type <> 'Percentage'
                OR discount_value <= 100
            )
        ),

    CONSTRAINT chk_coupon_dates
        CHECK (expiry_date >= start_date),

    CONSTRAINT chk_coupon_status
        CHECK (status IN ('Active', 'Inactive', 'Expired'))
);

-- ============================================================
-- 3. BRANCH
-- ============================================================

CREATE TABLE branch (
    branch_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    branch_name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20)
);

-- ============================================================
-- 4. EMPLOYEE
-- ============================================================

CREATE TABLE employee (
    employee_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    branch_id INTEGER REFERENCES branch(branch_id),

    CONSTRAINT chk_employee_role
        CHECK (
            role IN (
                'Counter Staff',
                'Hub Staff',
                'Delivery Rider',
                'Pickup Rider',
                'Customer Service',
                'Finance',
                'System Admin',
                'Manager'
            )
        )
);

-- ============================================================
-- 5. ORDERS
-- ============================================================

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

    shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (shipping_fee >= 0),

    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (total_amount >= 0),

    order_status VARCHAR(50) NOT NULL DEFAULT 'Order Created',

    membership_discount_amount NUMERIC(10,2)
        NOT NULL DEFAULT 0
        CHECK (membership_discount_amount >= 0),

    CONSTRAINT chk_order_service
        CHECK (service_type IN ('Standard', 'Express')),

    CONSTRAINT chk_order_status
        CHECK (
            order_status IN (
                'Order Created',
                'Picked Up',
                'In Transit',
                'Out for Delivery',
                'Delivered',
                'Failed',
                'Returned',
                'Cancelled'
            )
        )
);

-- ============================================================
-- 6. PARCEL
-- ============================================================

CREATE TABLE parcel (
    parcel_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- One order can reference at most one parcel.
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(order_id),

    tracking_number VARCHAR(50) NOT NULL UNIQUE,

    parcel_type VARCHAR(50),

    weight NUMERIC(10,2)
        CHECK (weight IS NULL OR weight > 0),

    length NUMERIC(10,2)
        CHECK (length IS NULL OR length > 0),

    width NUMERIC(10,2)
        CHECK (width IS NULL OR width > 0),

    height NUMERIC(10,2)
        CHECK (height IS NULL OR height > 0),

    destination_zone VARCHAR(100),
    special_handling VARCHAR(100),

    current_status VARCHAR(50)
        NOT NULL DEFAULT 'Order Created',

    storage_start_date DATE,
    return_status VARCHAR(50),

    CONSTRAINT chk_parcel_type
        CHECK (
            parcel_type IN (
                'Document', 'Box', 'Chilled', 'Frozen'
            )
        ),

    CONSTRAINT chk_parcel_status
        CHECK (
            current_status IN (
                'Order Created',
                'Picked Up',
                'In Transit',
                'Out for Delivery',
                'Delivered',
                'Failed',
                'Returned'
            )
        ),

    CONSTRAINT chk_return_status
        CHECK (
            return_status IN (
                'Pending Return', 'Returned'
            )
        )
);

-- ============================================================
-- 7. PARCEL STATUS HISTORY
-- ============================================================

CREATE TABLE parcel_status_history (
    status_history_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    parcel_id INTEGER NOT NULL REFERENCES parcel(parcel_id),

    -- NULL allowed for system-generated Order Created events.
    employee_id INTEGER REFERENCES employee(employee_id),

    status VARCHAR(50) NOT NULL,

    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    location VARCHAR(255) NOT NULL,

    CONSTRAINT chk_history_location
        CHECK (btrim(location) <> ''),

    CONSTRAINT chk_history_status
        CHECK (
            status IN (
                'Order Created',
                'Picked Up',
                'In Transit',
                'Out for Delivery',
                'Delivered',
                'Failed',
                'Returned'
            )
        )
);

-- ============================================================
-- 8. PICKUP
-- ============================================================

CREATE TABLE pickup (
    pickup_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    employee_id INTEGER REFERENCES employee(employee_id),

    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,

    pickup_location TEXT,
    pickup_result VARCHAR(50),
    inspection_status VARCHAR(50),

    CONSTRAINT chk_pickup_result
        CHECK (
            pickup_result IN (
                'Scheduled',
                'Successful',
                'Failed',
                'Cancelled'
            )
        ),

    CONSTRAINT chk_pickup_inspection
        CHECK (
            pickup_result IS DISTINCT FROM 'Successful'
            OR inspection_status = 'Passed'
        ),

    CONSTRAINT chk_inspection_status
        CHECK (
            inspection_status IN (
                'Pending', 'Passed', 'Failed'
            )
        )
);

-- One pickup can cover multiple orders.
-- Each order has at most one pickup.
ALTER TABLE orders
ADD COLUMN pickup_id INTEGER REFERENCES pickup(pickup_id);

-- ============================================================
-- 9. DELIVERY
-- ============================================================

CREATE TABLE delivery (
    delivery_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    parcel_id INTEGER NOT NULL REFERENCES parcel(parcel_id),
    employee_id INTEGER REFERENCES employee(employee_id),

    delivery_date TIMESTAMPTZ,

    delivery_status VARCHAR(50) NOT NULL DEFAULT 'Pending',

    -- Reference to photo or digital signature.
    proof_of_delivery TEXT,

    CONSTRAINT chk_delivery_status
        CHECK (
            delivery_status IN (
                'Pending',
                'In Transit',
                'Delivered',
                'Failed',
                'Returned'
            )
        ),

    CONSTRAINT chk_delivery_proof
        CHECK (
            delivery_status <> 'Delivered'
            OR (
                proof_of_delivery IS NOT NULL
                AND btrim(proof_of_delivery) <> ''
            )
        ),

    CONSTRAINT chk_delivered_date
        CHECK (
            delivery_status <> 'Delivered'
            OR delivery_date IS NOT NULL
        )
);

-- ============================================================
-- 10. PAYMENT
-- ============================================================

CREATE TABLE payment (
    payment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id INTEGER NOT NULL REFERENCES orders(order_id),

    payment_method VARCHAR(50),

    payment_amount NUMERIC(10,2) NOT NULL
        CHECK (payment_amount >= 0),

    payment_date TIMESTAMPTZ,

    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',

    CONSTRAINT chk_payment_status
        CHECK (
            payment_status IN (
                'Pending', 'Paid', 'Failed', 'Refunded'
            )
        ),

    CONSTRAINT chk_payment_method
        CHECK (
            payment_method IN (
                'Cash', 'QR', 'Card', 'Bank Transfer'
            )
        )
);

-- ============================================================
-- 11. COD (CASH ON DELIVERY)
-- ============================================================

CREATE TABLE cod (
    cod_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(order_id),

    cod_amount NUMERIC(10,2) NOT NULL
        CHECK (cod_amount >= 0),

    cod_fee NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (cod_fee >= 0),

    collected_amount NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (collected_amount >= 0),

    collected_date TIMESTAMPTZ,
    settlement_date TIMESTAMPTZ,

    settlement_status VARCHAR(50) NOT NULL DEFAULT 'Pending',

    settlement_amount NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (settlement_amount >= 0),

    CONSTRAINT chk_cod_settlement_status
        CHECK (
            settlement_status IN (
                'Pending',
                'Collected',
                'Settled',
                'Cancelled'
            )
        ),

    CONSTRAINT chk_cod_settlement_dates
        CHECK (
            settlement_date IS NULL
            OR (
                collected_date IS NOT NULL
                AND settlement_date >= collected_date
            )
        ),

    CONSTRAINT chk_cod_settled_details
        CHECK (
            settlement_status <> 'Settled'
            OR (
                collected_date IS NOT NULL
                AND settlement_date IS NOT NULL
                AND settlement_amount > 0
            )
        ),

    CONSTRAINT chk_cod_collected_amount
        CHECK (
            collected_amount <= cod_amount
        )
);

-- ============================================================
-- BR: CHILLED/FROZEN REQUIRES EXPRESS
-- ============================================================

CREATE OR REPLACE FUNCTION validate_parcel_service()
RETURNS TRIGGER AS $$
DECLARE
    selected_service VARCHAR(50);
BEGIN
    SELECT service_type
    INTO selected_service
    FROM orders
    WHERE order_id = NEW.order_id
    FOR UPDATE;

    IF NEW.parcel_type IN ('Chilled', 'Frozen')
       AND selected_service IS DISTINCT FROM 'Express' THEN

        RAISE EXCEPTION
            'Chilled/Frozen parcels require Express service';

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_parcel_service
BEFORE INSERT OR UPDATE OF parcel_type, order_id
ON parcel
FOR EACH ROW
EXECUTE FUNCTION validate_parcel_service();

-- Prevent changing an existing chilled/frozen order
-- from Express to Standard.

CREATE OR REPLACE FUNCTION validate_order_service()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.service_type IS DISTINCT FROM 'Express'
       AND EXISTS (
           SELECT 1
           FROM parcel
           WHERE order_id = NEW.order_id
             AND parcel_type IN ('Chilled', 'Frozen')
       ) THEN

        RAISE EXCEPTION
            'Chilled/Frozen parcels require Express service';

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_order_service
BEFORE UPDATE OF service_type
ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_service();

-- ============================================================
-- BR: PARCEL STATUS WORKFLOW
-- ============================================================

-- Validate changes to the parcel's current status.
-- A new parcel may be seeded with an existing status,
-- but subsequent changes must follow the workflow.

CREATE OR REPLACE FUNCTION validate_parcel_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_allowed BOOLEAN := FALSE;
BEGIN
    IF NEW.current_status IS NOT DISTINCT FROM OLD.current_status THEN
        RETURN NEW;
    END IF;

    v_allowed := CASE

        WHEN OLD.current_status = 'Order Created'
            THEN NEW.current_status IN (
                'Picked Up', 'Failed'
            )

        WHEN OLD.current_status = 'Picked Up'
            THEN NEW.current_status IN (
                'In Transit', 'Failed'
            )

        WHEN OLD.current_status = 'In Transit'
            THEN NEW.current_status IN (
                'Out for Delivery', 'Failed'
            )

        WHEN OLD.current_status = 'Out for Delivery'
            THEN NEW.current_status IN (
                'Delivered', 'Failed'
            )

        WHEN OLD.current_status = 'Failed'
            THEN NEW.current_status IN (
                'Out for Delivery', 'Returned'
            )

        ELSE FALSE

    END;

    IF NOT COALESCE(v_allowed, FALSE) THEN
        RAISE EXCEPTION
            'Invalid status transition: % -> %',
            OLD.current_status,
            NEW.current_status;
    END IF;

    -- Direct status changes are blocked for normal application
    -- roles by access_control.sql. Privileged database owners
    -- must use update_parcel_status() for proper history logging.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_parcel_status_change
BEFORE UPDATE OF current_status
ON parcel
FOR EACH ROW
EXECUTE FUNCTION validate_parcel_status_change();

-- ============================================================
-- BR: UPDATE STATUS AND LOG HISTORY ATOMICALLY
-- ============================================================

CREATE OR REPLACE FUNCTION update_parcel_status(
    p_tracking_number VARCHAR,
    p_new_status VARCHAR,
    p_location VARCHAR,
    p_employee_id INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_parcel_id INTEGER;
    v_old_status VARCHAR(50);
BEGIN

    IF p_tracking_number IS NULL
       OR btrim(p_tracking_number) = '' THEN
        RAISE EXCEPTION 'Tracking number is required';
    END IF;

    IF p_new_status IS NULL THEN
        RAISE EXCEPTION 'New status is required';
    END IF;

    IF p_location IS NULL OR btrim(p_location) = '' THEN
        RAISE EXCEPTION 'Location is required';
    END IF;

    IF p_employee_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM employee
        WHERE employee_id = p_employee_id
    ) THEN
        RAISE EXCEPTION 'Valid employee is required';
    END IF;

    SELECT parcel_id, current_status
    INTO v_parcel_id, v_old_status
    FROM parcel
    WHERE tracking_number = p_tracking_number
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tracking number not found';
    END IF;

    -- The trigger validates the transition.
    UPDATE parcel
    SET current_status = p_new_status
    WHERE parcel_id = v_parcel_id;

    -- The history insert and status update are atomic.
    INSERT INTO parcel_status_history (
        parcel_id,
        employee_id,
        status,
        location
    )
    VALUES (
        v_parcel_id,
        p_employee_id,
        p_new_status,
        p_location
    );

END;
$$;

-- ============================================================
-- BR: FAILED DELIVERY CANCELS UNCOLLECTED COD
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_cod_on_failed_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF NEW.delivery_status = 'Failed'
       AND (
           TG_OP = 'INSERT'
           OR OLD.delivery_status IS DISTINCT FROM 'Failed'
       ) THEN

        UPDATE cod
        SET settlement_status = 'Cancelled'
        WHERE order_id = (
            SELECT order_id
            FROM parcel
            WHERE parcel_id = NEW.parcel_id
        )
        AND settlement_status = 'Pending'
        AND collected_amount = 0;

    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cancel_cod_on_failed_delivery
AFTER INSERT OR UPDATE OF delivery_status
ON delivery
FOR EACH ROW
EXECUTE FUNCTION cancel_cod_on_failed_delivery();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_orders_customer
ON orders(customer_id);

CREATE INDEX idx_orders_pickup
ON orders(pickup_id);

CREATE INDEX idx_history_parcel_time
ON parcel_status_history(parcel_id, timestamp);

CREATE INDEX idx_pickup_employee_date
ON pickup(employee_id, appointment_date);

CREATE INDEX idx_delivery_parcel
ON delivery(parcel_id);

CREATE INDEX idx_payment_order
ON payment(order_id);

-- The tracking_number UNIQUE constraint already creates
-- an index, so no duplicate index is needed.

-- ============================================================
-- WORKFLOW RULES OUTSIDE BASIC SCHEMA CONSTRAINTS
-- ============================================================

-- 1. Shipping fee calculation:
--    Requires an agreed rate table or application formula.

-- 2. Return unclaimed parcels after 7 days:
--    Requires a scheduled job or application workflow.

-- 3. COD settlement within 2 business days:
--    Requires business-day calendar and scheduled monitoring.

-- 4. Customer-specific access:
--    Implement authentication-bound access control
--    in access_control.sql and the backend.

-- 5. Employee role permissions:
--    Implement PostgreSQL GRANT/REVOKE
--    in access_control.sql.

-- 6. Every order must eventually have a parcel:
--    Enforce in the order-confirmation workflow.
--    The UNIQUE FK currently enforces at most one parcel.

-- 7. Automatic history on direct privileged updates:
--    Not implemented. Application roles must not receive
--    direct parcel status UPDATE permission.
--    Use update_parcel_status() through a controlled backend.
--    The function must be permission-tested before deployment.

-- 8. Failed delivery with already collected COD:
--    Requires a refund/reconciliation workflow;
--    only uncollected Pending COD is auto-cancelled.

COMMIT;
