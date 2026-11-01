
-- US-01: Parcel Tracking Database Schema
-- LAAM Express | PostgreSQL

-- Table 1: PARCEL
CREATE TABLE IF NOT EXISTS parcel (
    parcel_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tracking_number VARCHAR(50) NOT NULL UNIQUE,
    parcel_type VARCHAR(50),
    weight NUMERIC(10,2),
    length NUMERIC(10,2),
    width NUMERIC(10,2),
    height NUMERIC(10,2),
    destination_zone VARCHAR(100),
    special_handling VARCHAR(100),
    current_status VARCHAR(50) NOT NULL DEFAULT 'Order Created',
    storage_start_date DATE,
    return_status VARCHAR(50)
);

-- Table 2: PARCEL_STATUS_HISTORY
CREATE TABLE IF NOT EXISTS parcel_status_history (
    status_history_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parcel_id INTEGER NOT NULL,
    employee_id INTEGER,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(255),

    CONSTRAINT fk_history_parcel
        FOREIGN KEY (parcel_id)
        REFERENCES parcel(parcel_id)
);

