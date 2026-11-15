-- ============================================================
-- LAAM Express | Schema Migration 001
-- Upgrades the existing development database without deleting data.
-- Back up the database before running. Apply only once.
-- ============================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

-- Prevent accidental execution on the original tracking DB or test DB.
DO $$
BEGIN
    IF current_database() NOT IN (
    'laam_express_dev',
    'laam_express_migration_test'
) THEN
        RAISE EXCEPTION 'Wrong database: %. Expected laam_express_dev', current_database();
    END IF;
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_parcel_service' AND NOT tgisinternal) THEN
        RAISE EXCEPTION 'Migration 001 appears already applied; stop instead of rerunning';
    END IF;
END;
$$;

-- Fail clearly if legacy data cannot satisfy the new NOT NULL requirement.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.parcel_status_history WHERE location IS NULL OR btrim(location) = '') THEN
        RAISE EXCEPTION 'Preflight failed: parcel_status_history has missing/blank locations; inspect rows before migrating';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.parcel p JOIN public.orders o ON o.order_id = p.order_id
        WHERE p.parcel_type IN ('Chilled','Frozen') AND o.service_type IS DISTINCT FROM 'Express'
    ) THEN
        RAISE EXCEPTION 'Preflight failed: Chilled/Frozen parcel has non-Express order';
    END IF;
END;
$$;

-- Constraints missing from the exported development schema.
ALTER TABLE public.employee
    ADD CONSTRAINT chk_employee_role CHECK (role IN (
        'Counter Staff','Hub Staff','Delivery Rider','Pickup Rider',
        'Customer Service','Finance','System Admin','Manager'
    ));

ALTER TABLE public.orders
    ADD CONSTRAINT chk_order_service CHECK (service_type IN ('Standard','Express')),
    ADD CONSTRAINT chk_order_status CHECK (order_status IN (
        'Order Created','Picked Up','In Transit','Out for Delivery',
        'Delivered','Failed','Returned','Cancelled'
    ));

ALTER TABLE public.parcel
    ADD CONSTRAINT chk_parcel_type CHECK (parcel_type IN ('Document','Box','Chilled','Frozen')),
    ADD CONSTRAINT chk_parcel_status CHECK (current_status IN (
        'Order Created','Picked Up','In Transit','Out for Delivery',
        'Delivered','Failed','Returned'
    )),
    ADD CONSTRAINT chk_return_status CHECK (return_status IN ('Pending Return','Returned'));

ALTER TABLE public.parcel_status_history
    ALTER COLUMN location SET NOT NULL,
    ADD CONSTRAINT chk_history_location CHECK (btrim(location) <> ''),
    ADD CONSTRAINT chk_history_status CHECK (status IN (
        'Order Created','Picked Up','In Transit','Out for Delivery',
        'Delivered','Failed','Returned'
    ));

ALTER TABLE public.pickup
    ADD CONSTRAINT chk_pickup_result CHECK (pickup_result IN (
        'Scheduled','Successful','Failed','Cancelled'
    )),
    ADD CONSTRAINT chk_pickup_inspection CHECK (
        pickup_result IS DISTINCT FROM 'Successful' OR inspection_status = 'Passed'
    ),
    ADD CONSTRAINT chk_inspection_status CHECK (inspection_status IN (
        'Pending','Passed','Failed'
    ));

ALTER TABLE public.delivery
    ADD CONSTRAINT chk_delivery_status CHECK (delivery_status IN (
        'Pending','In Transit','Delivered','Failed','Returned'
    )),
    ADD CONSTRAINT chk_delivered_date CHECK (
        delivery_status <> 'Delivered' OR delivery_date IS NOT NULL
    );
-- chk_delivery_proof already exists: do not add it twice.

ALTER TABLE public.payment
    ADD CONSTRAINT chk_payment_status CHECK (payment_status IN (
        'Pending','Paid','Failed','Refunded'
    )),
    ADD CONSTRAINT chk_payment_method CHECK (payment_method IN (
        'Cash','QR','Card','Bank Transfer'
    ));

ALTER TABLE public.cod
    ADD CONSTRAINT chk_cod_settlement_status CHECK (settlement_status IN (
        'Pending','Collected','Settled','Cancelled'
    )),
    ADD CONSTRAINT chk_cod_settled_details CHECK (
        settlement_status <> 'Settled' OR (
            collected_date IS NOT NULL AND settlement_date IS NOT NULL
            AND settlement_amount > 0
        )
    ),
    ADD CONSTRAINT chk_cod_collected_amount CHECK (collected_amount <= cod_amount);

-- Existing constraint allows settlement_date without collected_date.
-- Replace with the exact stronger final-schema definition.
ALTER TABLE public.cod DROP CONSTRAINT chk_cod_settlement_dates;
ALTER TABLE public.cod ADD CONSTRAINT chk_cod_settlement_dates CHECK (
    settlement_date IS NULL OR (
        collected_date IS NOT NULL AND settlement_date >= collected_date
    )
);

-- Chilled/Frozen parcels require Express service.
CREATE OR REPLACE FUNCTION public.validate_parcel_service()
RETURNS TRIGGER AS $$
DECLARE selected_service VARCHAR(50);
BEGIN
    SELECT service_type INTO selected_service
    FROM public.orders WHERE order_id = NEW.order_id FOR UPDATE;
    IF NEW.parcel_type IN ('Chilled','Frozen')
       AND selected_service IS DISTINCT FROM 'Express' THEN
        RAISE EXCEPTION 'Chilled/Frozen parcels require Express service';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_parcel_service
BEFORE INSERT OR UPDATE OF parcel_type, order_id ON public.parcel
FOR EACH ROW EXECUTE FUNCTION public.validate_parcel_service();

CREATE OR REPLACE FUNCTION public.validate_order_service()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.service_type IS DISTINCT FROM 'Express' AND EXISTS (
        SELECT 1 FROM public.parcel
        WHERE order_id = NEW.order_id AND parcel_type IN ('Chilled','Frozen')
    ) THEN
        RAISE EXCEPTION 'Chilled/Frozen parcels require Express service';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_order_service
BEFORE UPDATE OF service_type ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_service();

-- Allowed transitions; terminal statuses cannot change.
CREATE OR REPLACE FUNCTION public.validate_parcel_status_change()
RETURNS TRIGGER AS $$
DECLARE v_allowed BOOLEAN := FALSE;
BEGIN
    IF NEW.current_status IS NOT DISTINCT FROM OLD.current_status THEN
        RETURN NEW;
    END IF;
    v_allowed := CASE
        WHEN OLD.current_status = 'Order Created' THEN NEW.current_status IN ('Picked Up','Failed')
        WHEN OLD.current_status = 'Picked Up' THEN NEW.current_status IN ('In Transit','Failed')
        WHEN OLD.current_status = 'In Transit' THEN NEW.current_status IN ('Out for Delivery','Failed')
        WHEN OLD.current_status = 'Out for Delivery' THEN NEW.current_status IN ('Delivered','Failed')
        WHEN OLD.current_status = 'Failed' THEN NEW.current_status IN ('Out for Delivery','Returned')
        ELSE FALSE
    END;
    IF NOT COALESCE(v_allowed,FALSE) THEN
        RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.current_status, NEW.current_status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_parcel_status_change
BEFORE UPDATE OF current_status ON public.parcel
FOR EACH ROW EXECUTE FUNCTION public.validate_parcel_status_change();

-- Atomic update + history insert. Privileged code must use this function;
-- application roles must not have direct UPDATE privilege on parcel.
CREATE OR REPLACE FUNCTION public.update_parcel_status(
    p_tracking_number VARCHAR, p_new_status VARCHAR,
    p_location VARCHAR, p_employee_id INTEGER
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_parcel_id INTEGER; v_old_status VARCHAR(50);
BEGIN
    IF p_tracking_number IS NULL OR btrim(p_tracking_number) = '' THEN
        RAISE EXCEPTION 'Tracking number is required';
    END IF;
    IF p_new_status IS NULL THEN RAISE EXCEPTION 'New status is required'; END IF;
    IF p_location IS NULL OR btrim(p_location) = '' THEN
        RAISE EXCEPTION 'Location is required';
    END IF;
    IF p_employee_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.employee WHERE employee_id = p_employee_id
    ) THEN RAISE EXCEPTION 'Valid employee is required'; END IF;

    SELECT parcel_id,current_status INTO v_parcel_id,v_old_status
    FROM public.parcel WHERE tracking_number = p_tracking_number FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tracking number not found'; END IF;
    UPDATE public.parcel SET current_status = p_new_status WHERE parcel_id = v_parcel_id;
    INSERT INTO public.parcel_status_history(parcel_id,employee_id,status,location)
    VALUES (v_parcel_id,p_employee_id,p_new_status,p_location);
END;
$$;

-- Failed delivery cancels only pending/uncollected COD.
CREATE OR REPLACE FUNCTION public.cancel_cod_on_failed_delivery()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.delivery_status = 'Failed' AND (
        TG_OP = 'INSERT' OR OLD.delivery_status IS DISTINCT FROM 'Failed'
    ) THEN
        UPDATE public.cod SET settlement_status = 'Cancelled'
        WHERE order_id = (
            SELECT order_id FROM public.parcel WHERE parcel_id = NEW.parcel_id
        ) AND settlement_status = 'Pending' AND collected_amount = 0;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cancel_cod_on_failed_delivery
AFTER INSERT OR UPDATE OF delivery_status ON public.delivery
FOR EACH ROW EXECUTE FUNCTION public.cancel_cod_on_failed_delivery();

COMMIT;
