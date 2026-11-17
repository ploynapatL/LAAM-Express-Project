
-- ============================================================
-- LAAM Express | Database Tests
-- Tests constraints, workflows, and basic role permissions.
-- Run after schema.sql, seed.sql, and access_control.sql.
-- Test changes are rolled back.
-- ============================================================

BEGIN;

-- TEST 1: EXPECTED TABLE COUNT = 11
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
          'customer', 'coupon', 'branch', 'employee',
          'orders', 'parcel', 'parcel_status_history',
          'pickup', 'delivery', 'payment', 'cod'
      );

    IF v_count <> 11 THEN
        RAISE EXCEPTION
            'TEST 1 FAILED: Expected 11 tables, found %',
            v_count;
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: 11 tables exist';
END;
$$;

-- TEST 2: DUPLICATE TRACKING NUMBER MUST FAIL
DO $$
BEGIN
    BEGIN
        INSERT INTO parcel (
            order_id, tracking_number, parcel_type
        )
        VALUES (3, 'LAAM001', 'Box');

        RAISE EXCEPTION 'TEST 2 FAILED';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE
                'TEST 2 PASSED: Duplicate tracking rejected';
    END;
END;
$$;

-- TEST 3: NEGATIVE SHIPPING FEE MUST FAIL
DO $$
BEGIN
    BEGIN
        UPDATE orders
        SET shipping_fee = -10
        WHERE order_id = 1;

        RAISE EXCEPTION 'TEST 3 FAILED';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE
                'TEST 3 PASSED: Negative fee rejected';
    END;
END;
$$;

-- TEST 4: CHILLED PARCEL WITH STANDARD MUST FAIL
DO $$
BEGIN
    BEGIN
        UPDATE parcel
        SET parcel_type = 'Chilled'
        WHERE tracking_number = 'LAAM001';

        RAISE EXCEPTION 'TEST 4 FAILED';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM = 'TEST 4 FAILED' THEN
                RAISE;
            END IF;

            IF SQLERRM NOT LIKE
                'Chilled/Frozen parcels require Express service%'
            THEN
                RAISE;
            END IF;

            RAISE NOTICE
                'TEST 4 PASSED: Express rule enforced';
    END;
END;
$$;

-- TEST 5: SUCCESSFUL PICKUP REQUIRES INSPECTION
DO $$
BEGIN
    BEGIN
        UPDATE pickup
        SET pickup_result = 'Successful',
            inspection_status = 'Pending'
        WHERE pickup_id = 2;

        RAISE EXCEPTION 'TEST 5 FAILED';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE
                'TEST 5 PASSED: Inspection required';
    END;
END;
$$;

-- TEST 6: DELIVERED REQUIRES PROOF
DO $$
BEGIN
    BEGIN
        UPDATE delivery
        SET delivery_status = 'Delivered',
            delivery_date = CURRENT_TIMESTAMP,
            proof_of_delivery = NULL
        WHERE delivery_id = 1;

        RAISE EXCEPTION 'TEST 6 FAILED';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE
                'TEST 6 PASSED: Delivery proof required';
    END;
END;
$$;

-- TEST 7: INVALID STATUS TRANSITION MUST FAIL
DO $$
BEGIN
    BEGIN
        UPDATE parcel
        SET current_status = 'Delivered'
        WHERE tracking_number = 'LAAM003';

        RAISE EXCEPTION 'TEST 7 FAILED';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM = 'TEST 7 FAILED' THEN
                RAISE;
            END IF;

            IF SQLERRM NOT LIKE
                'Invalid status transition:%'
            THEN
                RAISE;
            END IF;

            RAISE NOTICE
                'TEST 7 PASSED: Invalid transition rejected';
    END;
END;
$$;

-- TEST 8: VALID STATUS UPDATE MUST CREATE HISTORY
DO $$
DECLARE
    v_before INTEGER;
    v_after INTEGER;
    v_status VARCHAR(50);
BEGIN
    SELECT COUNT(*) INTO v_before
    FROM parcel_status_history h
    JOIN parcel p ON p.parcel_id = h.parcel_id
    WHERE p.tracking_number = 'LAAM003';

    PERFORM update_parcel_status(
        'LAAM003',
        'Picked Up',
        'Nonthaburi Branch',
        1
    );

    SELECT current_status INTO v_status
    FROM parcel
    WHERE tracking_number = 'LAAM003';

    SELECT COUNT(*) INTO v_after
    FROM parcel_status_history h
    JOIN parcel p ON p.parcel_id = h.parcel_id
    WHERE p.tracking_number = 'LAAM003';

    IF v_status <> 'Picked Up'
       OR v_after <> v_before + 1 THEN
        RAISE EXCEPTION
            'TEST 8 FAILED: Status/history mismatch';
    END IF;

    RAISE NOTICE
        'TEST 8 PASSED: Status and history updated';
END;
$$;

-- TEST 9: INVALID COD SETTLEMENT MUST FAIL
DO $$
BEGIN
    BEGIN
        UPDATE cod
        SET settlement_status = 'Settled',
            settlement_date = NULL
        WHERE cod_id = 1;

        RAISE EXCEPTION 'TEST 9 FAILED';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE
                'TEST 9 PASSED: COD settlement validated';
    END;
END;
$$;

-- TEST 10: ROLE PERMISSIONS
DO $$
BEGIN
    IF NOT has_table_privilege(
        'laam_tracking_reader', 'parcel', 'SELECT'
    ) THEN
        RAISE EXCEPTION
            'TEST 10 FAILED: Tracking SELECT missing';
    END IF;

    IF has_table_privilege(
        'laam_tracking_reader', 'parcel', 'UPDATE'
    ) THEN
        RAISE EXCEPTION
            'TEST 10 FAILED: Tracking can UPDATE parcel';
    END IF;

    IF has_table_privilege(
        'laam_pickup_rider', 'orders', 'SELECT'
    ) THEN
        RAISE EXCEPTION
            'TEST 10 FAILED: Rider can read all orders';
    END IF;

    RAISE NOTICE
        'TEST 10 PASSED: Basic role permissions verified';
END;
$$;

-- TEST 11: FOREIGN KEY MUST REJECT INVALID CUSTOMER
DO $$
BEGIN
    BEGIN
        INSERT INTO orders (customer_id, service_type)
        VALUES (-99999, 'Standard');

        RAISE EXCEPTION 'TEST 11 FAILED';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE
                'TEST 11 PASSED: Invalid customer rejected';
    END;
END;
$$;

-- TEST 12: CHANGING EXPRESS ORDER TO STANDARD
-- MUST FAIL WHEN IT CONTAINS CHILLED PARCEL
DO $$
BEGIN
    UPDATE parcel
    SET parcel_type = 'Chilled'
    WHERE tracking_number = 'LAAM002';

    BEGIN
        UPDATE orders
        SET service_type = 'Standard'
        WHERE order_id = 2;

        RAISE EXCEPTION 'TEST 12 FAILED';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM = 'TEST 12 FAILED' THEN
                RAISE;
            END IF;

            IF SQLERRM NOT LIKE
                'Chilled/Frozen parcels require Express service%'
            THEN
                RAISE;
            END IF;

            RAISE NOTICE
                'TEST 12 PASSED: Order service protected';
    END;
END;
$$;

-- Restore all test changes, including TEST 8 and TEST 12.
ROLLBACK;

-- ============================================================
-- END OF TESTS
-- ============================================================
