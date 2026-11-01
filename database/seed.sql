
-- US-01: Sample Parcel Tracking Data
-- LAAM Express | PostgreSQL
-- Safe to run multiple times

-- Insert sample parcels
INSERT INTO parcel (
    tracking_number,
    parcel_type,
    weight,
    destination_zone,
    current_status
)
VALUES
    ('LAAM001', 'Document', 0.50, 'Bangkok', 'In Transit'),
    ('LAAM002', 'Box', 2.50, 'Chiang Mai', 'Delivered'),
    ('LAAM003', 'Box', 1.20, 'Phuket', 'Order Created')
ON CONFLICT (tracking_number) DO NOTHING;

-- Insert tracking history without duplicates
WITH sample_history (tracking_number, status, event_time, location) AS (
    VALUES
        ('LAAM001', 'Order Created', '2026-10-29 09:00:00+07'::TIMESTAMPTZ, 'Bangkok'),
        ('LAAM001', 'Picked Up', '2026-10-30 10:30:00+07'::TIMESTAMPTZ, 'Bangkok'),
        ('LAAM001', 'In Transit', '2026-10-31 14:00:00+07'::TIMESTAMPTZ, 'Pathum Thani'),

        ('LAAM002', 'Order Created', '2026-10-27 08:00:00+07'::TIMESTAMPTZ, 'Bangkok'),
        ('LAAM002', 'In Transit', '2026-10-28 12:00:00+07'::TIMESTAMPTZ, 'Lamphun'),
        ('LAAM002', 'Delivered', '2026-10-29 15:00:00+07'::TIMESTAMPTZ, 'Chiang Mai'),

        ('LAAM003', 'Order Created', '2026-10-31 11:00:00+07'::TIMESTAMPTZ, 'Bangkok')
)
INSERT INTO parcel_status_history (
    parcel_id,
    status,
    timestamp,
    location
)
SELECT
    p.parcel_id,
    s.status,
    s.event_time,
    s.location
FROM sample_history s
JOIN parcel p
    ON p.tracking_number = s.tracking_number
WHERE NOT EXISTS (
    SELECT 1
    FROM parcel_status_history h
    WHERE h.parcel_id = p.parcel_id
      AND h.status = s.status
      AND h.timestamp = s.event_time
      AND h.location IS NOT DISTINCT FROM s.location
);
