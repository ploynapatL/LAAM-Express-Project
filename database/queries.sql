
-- Demo queries: run after schema.sql + seed.sql

-- A-1: US-01 Parcel Tracking
SELECT p.tracking_number, p.current_status,
       h.status, h.timestamp, h.location
FROM parcel p
JOIN parcel_status_history h ON h.parcel_id = p.parcel_id
WHERE p.tracking_number = 'LAAM001'
ORDER BY h.timestamp, h.status_history_id;


-- A-1: US-02 Pickup Rider Schedule
SELECT e.name AS rider, pu.pickup_id,
       pu.appointment_date, pu.appointment_time,
       pu.pickup_location,
       COUNT(o.order_id) AS order_count
FROM pickup pu
JOIN employee e ON e.employee_id = pu.employee_id
LEFT JOIN orders o ON o.pickup_id = pu.pickup_id
GROUP BY e.name, pu.pickup_id,
         pu.appointment_date, pu.appointment_time,
         pu.pickup_location
ORDER BY pu.appointment_date, pu.appointment_time;


-- A-1: US-03 Rider Customer Contact Details
SELECT e.name AS rider, pu.pickup_id, o.order_id,
       o.sender_name, o.sender_phone, o.sender_address,
       o.receiver_name, o.receiver_phone, o.receiver_address
FROM pickup pu
JOIN employee e ON e.employee_id = pu.employee_id
JOIN orders o ON o.pickup_id = pu.pickup_id
WHERE e.employee_id = 1
ORDER BY pu.appointment_date, o.order_id;


-- A-3: Aggregate and GROUP BY
SELECT c.customer_id, c.name,
       COUNT(o.order_id) AS total_orders,
       COALESCE(SUM(o.total_amount), 0) AS total_order_value
FROM customer c
LEFT JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name
ORDER BY total_order_value DESC;


-- A-4: Inspect Database Constraints
SELECT conrelid::regclass AS table_name,
       conname AS constraint_name, contype
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;


-- A-5: Transaction Demo (ROLLBACK)
BEGIN;

UPDATE parcel
SET current_status = 'Demo Temporary Status'
WHERE tracking_number = 'LAAM001';

SELECT tracking_number, current_status
FROM parcel
WHERE tracking_number = 'LAAM001';

ROLLBACK;

SELECT tracking_number, current_status
FROM parcel
WHERE tracking_number = 'LAAM001';

