
-- ============================================================
-- LAAM Express | Demo Queries
-- SQL queries for tracking, pickup, and database demonstrations.
-- Run after schema.sql and seed.sql.
-- ============================================================

-- ============================================================
-- A-1: US-01 PARCEL TRACKING
-- ============================================================

-- Find a parcel using its tracking number.
SELECT
    p.parcel_id,
    p.tracking_number,
    p.parcel_type,
    p.current_status,
    p.destination_zone
FROM parcel p
WHERE p.tracking_number = 'LAAM001';

-- View tracking history in chronological order.
SELECT
    p.tracking_number,
    h.status,
    h.timestamp,
    h.location,
    e.name AS updated_by
FROM parcel p
JOIN parcel_status_history h
    ON h.parcel_id = p.parcel_id
LEFT JOIN employee e
    ON e.employee_id = h.employee_id
WHERE p.tracking_number = 'LAAM001'
ORDER BY h.timestamp ASC, h.status_history_id ASC;


-- ============================================================
-- A-1: US-02 PICKUP RIDER SCHEDULE
-- ============================================================

SELECT
    e.employee_id AS rider_id,
    e.name AS rider,
    pu.pickup_id,
    pu.appointment_date,
    pu.appointment_time,
    pu.pickup_location,
    pu.pickup_result,
    COUNT(o.order_id) AS order_count
FROM pickup pu
JOIN employee e
    ON e.employee_id = pu.employee_id
LEFT JOIN orders o
    ON o.pickup_id = pu.pickup_id
WHERE e.role = 'Pickup Rider'
GROUP BY
    e.employee_id,
    e.name,
    pu.pickup_id,
    pu.appointment_date,
    pu.appointment_time,
    pu.pickup_location,
    pu.pickup_result
ORDER BY
    pu.appointment_date,
    pu.appointment_time;


-- ============================================================
-- A-1: US-03 RIDER CUSTOMER CONTACT DETAILS
-- ============================================================

-- Demo only: application must verify rider authorization.
SELECT
    e.employee_id AS rider_id,
    e.name AS rider,
    pu.pickup_id,
    o.order_id,
    o.sender_name,
    o.sender_phone,
    o.sender_address,
    o.receiver_name,
    o.receiver_phone,
    o.receiver_address
FROM pickup pu
JOIN employee e
    ON e.employee_id = pu.employee_id
JOIN orders o
    ON o.pickup_id = pu.pickup_id
WHERE e.employee_id = 1
  AND e.role = 'Pickup Rider'
ORDER BY
    pu.appointment_date,
    o.order_id;


-- ============================================================
-- A-3: JOIN + AGGREGATE + GROUP BY
-- ============================================================

SELECT
    c.customer_id,
    c.name,
    COUNT(o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_order_value
FROM customer c
LEFT JOIN orders o
    ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name
ORDER BY total_order_value DESC;


-- ============================================================
-- A-3: PAYMENT SUMMARY
-- ============================================================

SELECT
    o.order_id,
    p.tracking_number,
    o.total_amount,
    COALESCE(SUM(
        CASE
            WHEN pay.payment_status = 'Paid'
            THEN pay.payment_amount
            ELSE 0
        END
    ), 0) AS paid_amount
FROM orders o
JOIN parcel p
    ON p.order_id = o.order_id
LEFT JOIN payment pay
    ON pay.order_id = o.order_id
GROUP BY
    o.order_id,
    p.tracking_number,
    o.total_amount
ORDER BY o.order_id;


-- ============================================================
-- A-3: COD SUMMARY
-- ============================================================

SELECT
    o.order_id,
    p.tracking_number,
    c.cod_amount,
    c.collected_amount,
    c.settlement_amount,
    c.settlement_status,
    c.collected_date,
    c.settlement_date
FROM cod c
JOIN orders o
    ON o.order_id = c.order_id
JOIN parcel p
    ON p.order_id = o.order_id
ORDER BY o.order_id;


-- ============================================================
-- A-4: INSPECT DATABASE CONSTRAINTS
-- ============================================================

SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;


-- ============================================================
-- A-4: INSPECT TRIGGERS
-- ============================================================

SELECT
    event_object_table AS table_name,
    trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;


-- ============================================================
-- A-5: TRANSACTION DEMO (ROLLBACK)
-- ============================================================

-- Demonstrate a valid temporary change.
-- ROLLBACK restores the original value.

BEGIN;

SELECT
    tracking_number,
    destination_zone
FROM parcel
WHERE tracking_number = 'LAAM001';

UPDATE parcel
SET destination_zone = 'Demo Zone'
WHERE tracking_number = 'LAAM001';

SELECT
    tracking_number,
    destination_zone
FROM parcel
WHERE tracking_number = 'LAAM001';

ROLLBACK;

-- Confirm that the original value was restored.
SELECT
    tracking_number,
    destination_zone
FROM parcel
WHERE tracking_number = 'LAAM001';


-- ============================================================
-- A-5: ATOMIC STATUS UPDATE DEMO (ROLLBACK)
-- ============================================================

-- The function updates parcel status and inserts history.
-- ROLLBACK reverses both operations.

BEGIN;

SELECT update_parcel_status(
    'LAAM003',
    'Picked Up',
    'Nonthaburi Branch',
    1
);

SELECT
    p.tracking_number,
    p.current_status,
    h.status,
    h.location
FROM parcel p
JOIN parcel_status_history h
    ON h.parcel_id = p.parcel_id
WHERE p.tracking_number = 'LAAM003'
ORDER BY h.timestamp DESC, h.status_history_id DESC;

ROLLBACK;

-- Confirm the original status is unchanged.
SELECT tracking_number, current_status
FROM parcel
WHERE tracking_number = 'LAAM003';


-- ============================================================
-- END OF DEMO QUERIES
-- ============================================================
