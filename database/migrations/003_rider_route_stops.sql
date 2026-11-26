BEGIN;

CREATE TABLE rider_route_stop (
    route_stop_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employee(employee_id),
    route_date DATE NOT NULL,
    stop_order INTEGER NOT NULL CHECK (stop_order > 0),
    location TEXT NOT NULL CHECK (btrim(location) <> ''),
    UNIQUE (employee_id, route_date, stop_order),
    UNIQUE (route_stop_id, employee_id)
);

ALTER TABLE pickup
    ADD COLUMN route_stop_id INTEGER,
    ADD CONSTRAINT pickup_route_stop_requires_rider
        CHECK (route_stop_id IS NULL OR employee_id IS NOT NULL),
    ADD CONSTRAINT pickup_route_stop_owner
        FOREIGN KEY (route_stop_id, employee_id) REFERENCES rider_route_stop(route_stop_id, employee_id);

ALTER TABLE delivery
    ADD COLUMN route_stop_id INTEGER,
    ADD CONSTRAINT delivery_route_stop_requires_rider
        CHECK (route_stop_id IS NULL OR employee_id IS NOT NULL),
    ADD CONSTRAINT delivery_route_stop_owner
        FOREIGN KEY (route_stop_id, employee_id) REFERENCES rider_route_stop(route_stop_id, employee_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'laam_backend_reader') THEN
        GRANT SELECT ON rider_route_stop TO laam_backend_reader;
        GRANT SELECT (route_stop_id) ON pickup, delivery TO laam_backend_reader;
    END IF;
END;
$$;

COMMIT;
