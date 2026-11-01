
-- US-01: Parcel Tracking Queries
-- LAAM Express | PostgreSQL

-- Query 1: Find parcel by tracking number
-- Backend parameter: $1 = tracking number
PREPARE find_parcel(VARCHAR) AS
SELECT
    parcel_id,
    tracking_number,
    parcel_type,
    current_status,
    destination_zone
FROM parcel
WHERE tracking_number = $1;

-- Query 2: Get parcel status history
-- Backend parameter: $1 = tracking number
PREPARE find_tracking_history(VARCHAR) AS
SELECT
    p.tracking_number,
    h.status,
    h.timestamp,
    h.location
FROM parcel p
JOIN parcel_status_history h
    ON p.parcel_id = h.parcel_id
WHERE p.tracking_number = $1
ORDER BY h.timestamp ASC, h.status_history_id ASC;

-- Test Query 1
EXECUTE find_parcel('LAAM001');

-- Test Query 2
EXECUTE find_tracking_history('LAAM001');
