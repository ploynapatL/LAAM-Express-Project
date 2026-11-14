-- FUTURE SETUP ONLY. Run as the schema owner after schema.sql/access_control.sql.
-- Trusted backend login only. This role can read all rows needed by US1-US3;
-- HTTP assignment authorization is enforced by the backend, not PostgreSQL RLS.
-- Do not grant this role to riders or browser users.
BEGIN;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'laam_backend_reader') THEN
        CREATE ROLE laam_backend_reader NOLOGIN;
    END IF;
END;
$$;
GRANT USAGE ON SCHEMA public TO laam_backend_reader;
GRANT SELECT ON parcel, parcel_status_history TO laam_backend_reader;
GRANT SELECT (employee_id, role) ON employee TO laam_backend_reader;
GRANT SELECT (order_id, pickup_id, service_type, sender_phone, receiver_phone, receiver_address)
    ON orders TO laam_backend_reader;
GRANT SELECT (pickup_id, employee_id, appointment_date, appointment_time, pickup_location, pickup_result)
    ON pickup TO laam_backend_reader;
GRANT SELECT (delivery_id, parcel_id, employee_id, delivery_status)
    ON delivery TO laam_backend_reader;
COMMIT;
