function createPostgresRepository(pool) {
    return {
        dataSource: "postgresql",

        async findByTrackingNumber(trackingNumber) {
            const result = await pool.query(
                `
        SELECT
          p.tracking_number,
          p.current_status,
          p.destination_zone,
          h.status_history_id,
          h.status AS history_status,
          h.timestamp AS history_timestamp,
          h.location AS history_location
        FROM parcel p
        LEFT JOIN parcel_status_history h
          ON h.parcel_id = p.parcel_id
        WHERE p.tracking_number = $1
        ORDER BY
          h.timestamp DESC NULLS LAST,
          h.status_history_id DESC NULLS LAST
        `,
                [trackingNumber]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const parcel = result.rows[0];

            const history = result.rows
                .filter((row) => row.status_history_id !== null)
                .map((row) => ({
                    status: row.history_status,
                    location: row.history_location,
                    timestamp: new Date(
                        row.history_timestamp
                    ).toISOString(),
                }));

            const latest = history[0];

            return {
                trackingNumber: parcel.tracking_number,
                currentStatus: latest?.status ?? parcel.current_status,
                latestLocation: latest?.location ?? null,
                updatedAt: latest?.timestamp ?? null,
                destination: parcel.destination_zone,
                origin: null,
                serviceType: null,
                history,
            };
        },
    };
}

module.exports = { createPostgresRepository };