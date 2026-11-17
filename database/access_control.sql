
-- ============================================================
-- LAAM Express | Access Control
-- Defines database roles and permissions using GRANT/REVOKE.
-- Run after schema.sql.
-- ============================================================

BEGIN;

-- 1. CREATE DATABASE ROLES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'laam_tracking_reader'
    ) THEN
        CREATE ROLE laam_tracking_reader NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'laam_pickup_rider'
    ) THEN
        CREATE ROLE laam_pickup_rider NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'laam_finance'
    ) THEN
        CREATE ROLE laam_finance NOLOGIN;
    END IF;
END;
$$;

-- 2. REMOVE DEFAULT PUBLIC ACCESS
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Restrict newly created functions for this database owner.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Remove permissions previously assigned to these roles.
REVOKE ALL ON ALL TABLES IN SCHEMA public
FROM laam_tracking_reader, laam_pickup_rider, laam_finance;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public
FROM laam_tracking_reader, laam_pickup_rider, laam_finance;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public
FROM laam_tracking_reader, laam_pickup_rider, laam_finance;

-- 3. ALLOW ACCESS TO SCHEMA
GRANT USAGE ON SCHEMA public
TO laam_tracking_reader, laam_pickup_rider, laam_finance;

-- 4. TRACKING: READ-ONLY, NO CUSTOMER CONTACTS
GRANT SELECT ON parcel, parcel_status_history
TO laam_tracking_reader;

-- 5. PICKUP RIDER: LIMITED SCHEDULE ACCESS
GRANT SELECT (
    pickup_id,
    employee_id,
    appointment_date,
    appointment_time,
    pickup_location,
    pickup_result,
    inspection_status
)
ON pickup TO laam_pickup_rider;

-- Rider can see the employee directory for assignment.
GRANT SELECT (employee_id, name, role)
ON employee TO laam_pickup_rider;

-- Do not grant full orders/customer table access here.
-- Assigned customer contact information must be exposed
-- through an authenticated backend or an appropriately
-- secured, rider-scoped query/view.

-- 6. FINANCE: PAYMENT AND COD INFORMATION
GRANT SELECT ON payment, cod
TO laam_finance;

-- Finance can update settlement fields.
GRANT UPDATE (
    collected_amount,
    collected_date,
    settlement_amount,
    settlement_date,
    settlement_status
)
ON cod TO laam_finance;

-- 7. PROTECT STATUS UPDATES
-- No application role receives UPDATE on parcel.
-- No application role receives INSERT on history.
-- The status-update function is not exposed to PUBLIC.

REVOKE ALL ON FUNCTION update_parcel_status(
    VARCHAR, VARCHAR, VARCHAR, INTEGER
) FROM PUBLIC;

-- The function is SECURITY INVOKER by default.
-- It is deliberately NOT granted to application roles.
-- A trusted backend with verified identity and tightly
-- controlled permissions must handle status changes.

COMMIT;
