
const pool = require("../config/db");

function createPostgresRepository() {
  return {
    dataSource: "postgresql",

    async findByTrackingNumber(trackingNumber) {

      // 1. Find the parcel
      const parcelResult = await pool.query(
        `SELECT
           parcel_id,
           tracking_number,
           parcel_type,
           destination_zone,
           current_status
         FROM parcel
         WHERE tracking_number = $1`,
        [trackingNumber]
      );

      if (parcelResult.rows.length === 0) {
        return null;
      }

      const parcel = parcelResult.rows[0];

      // 2. Retrieve the parcel's tracking history
      const historyResult = await pool.query(
        `SELECT
           status,
           location,
           timestamp
         FROM parcel_status_history
         WHERE parcel_id = $1
         ORDER BY timestamp DESC, status_history_id DESC`,
        [parcel.parcel_id]
      );

      // 3. Convert PostgreSQL data to API format
      return {
        trackingNumber: parcel.tracking_number,
        currentStatus: parcel.current_status,
        serviceType: parcel.parcel_type,
        origin: null,
        destination: parcel.destination_zone,

        history: historyResult.rows.map(event => ({
          status: event.status,
          location: event.location,
          timestamp: event.timestamp
        }))
      };
    }
  };
}

module.exports = { createPostgresRepository };
