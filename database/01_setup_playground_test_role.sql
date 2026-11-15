-- LAAM Express: Dedicated local Playground test account
-- Run in pgAdmin Query Tool CONNECTED TO laam_express_dev, as schema owner/postgres.
-- This does not modify tables, stored records, triggers, or existing application grants.
-- IMPORTANT: Replace REPLACE_WITH_NEW_TEST_PASSWORD with a new strong password.
-- The same password must be entered in server/.env as PLAYGROUND_DB_PASSWORD.
-- This account is for LOCAL DEVELOPMENT ONLY; NEVER put it in a production environment.

DO $$
BEGIN
  IF current_database() <> 'laam_express_dev' THEN
    RAISE EXCEPTION 'Wrong database: %. Connect to laam_express_dev.', current_database();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'laam_playground_test') THEN
    CREATE ROLE laam_playground_test LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END;
$$;

-- Password deliberately supplied at install time; do not commit the edited SQL file.
ALTER ROLE laam_playground_test LOGIN PASSWORD 'REPLACE_WITH_NEW_TEST_PASSWORD';

GRANT CONNECT ON DATABASE laam_express_dev TO laam_playground_test;
GRANT USAGE ON SCHEMA public TO laam_playground_test;

-- Read access to the 11 tables required for fixed Playground test scenarios.
-- Never grant these privileges to browser users, customers, or rider roles.
GRANT SELECT ON TABLE
  public.branch,
  public.cod,
  public.coupon,
  public.customer,
  public.delivery,
  public.employee,
  public.orders,
  public.parcel,
  public.parcel_status_history,
  public.payment,
  public.pickup
TO laam_playground_test;

-- DML permissions required by the existing, predetermined scenarios.js tests.
-- No DELETE or TRUNCATE permissions are granted.
GRANT INSERT ON TABLE
  public.orders,
  public.parcel,
  public.payment
TO laam_playground_test;

GRANT UPDATE ON TABLE
  public.orders,
  public.parcel,
  public.pickup,
  public.delivery,
  public.cod
TO laam_playground_test;

-- The status-update function runs as SECURITY INVOKER and adds a history row.
GRANT INSERT ON TABLE public.parcel_status_history TO laam_playground_test;
GRANT EXECUTE ON FUNCTION public.update_parcel_status(
  character varying, character varying, character varying, integer
) TO laam_playground_test;

-- Identity/serial sequences used by insert tests, if present.
DO $$
DECLARE
  target regclass;
  tbl text;
  col text;
BEGIN
  FOR tbl, col IN
    SELECT * FROM (VALUES
      ('orders','order_id'), ('parcel','parcel_id'), ('payment','payment_id'),
      ('parcel_status_history','status_history_id')
    ) AS x(t,c)
  LOOP
    SELECT to_regclass(pg_get_serial_sequence('public.' || tbl, col)) INTO target;
    IF target IS NOT NULL THEN
      EXECUTE format('GRANT USAGE ON SEQUENCE %s TO laam_playground_test', target);
    END IF;
  END LOOP;
END;
$$;

-- Confirm effective access.  Every value below should be TRUE.
SELECT
  current_database() = 'laam_express_dev' AS correct_database,
  has_table_privilege('laam_playground_test','public.parcel','SELECT') AS can_read_parcel,
  has_table_privilege('laam_playground_test','public.parcel','UPDATE') AS can_update_parcel,
  has_table_privilege('laam_playground_test','public.orders','SELECT') AS can_read_orders,
  has_table_privilege('laam_playground_test','public.payment','INSERT') AS can_insert_payment,
  has_table_privilege('laam_playground_test','public.parcel_status_history','INSERT') AS can_insert_history,
  has_function_privilege('laam_playground_test',
      'public.update_parcel_status(character varying, character varying, character varying, integer)',
      'EXECUTE') AS can_call_status_function;
