
const pool = require("../config/db");

function createPostgresRepository(db = pool) {
  return {
    dataSource: "postgresql",

    async findEmployee(employeeId) {
      const result = await db.query('SELECT employee_id, role FROM employee WHERE employee_id = $1', [employeeId]);
      return result.rows[0] || null;
    },

    async findAssignments(employeeId, type = null) {
      const { rows } = await db.query(`
        WITH tasks AS (
          SELECT 'P-' || p.pickup_id || '-O-' || o.order_id AS "taskId",
                 'pickup' AS type, p.appointment_date AS task_date, p.appointment_time AS task_time,
                 p.pickup_location AS address, COALESCE(p.pickup_result, 'Scheduled') AS status,
                 p.route_stop_id, p.pickup_id AS sort_id, o.order_id
          FROM pickup p JOIN orders o ON o.pickup_id = p.pickup_id
          WHERE p.employee_id = $1 AND ($2::text IS NULL OR $2 = 'pickup')

          UNION ALL

          SELECT 'D-' || d.delivery_id, 'delivery', NULL::date, NULL::time,
                 o.receiver_address, d.delivery_status, d.route_stop_id, d.delivery_id, o.order_id
          FROM delivery d JOIN parcel p ON p.parcel_id = d.parcel_id
          JOIN orders o ON o.order_id = p.order_id
          WHERE d.employee_id = $1 AND ($2::text IS NULL OR $2 = 'delivery')
        )
        SELECT tasks."taskId", tasks.type, to_char(tasks.task_date, 'YYYY-MM-DD') AS date,
               to_char(tasks.task_time, 'HH24:MI') AS "startTime", NULL::text AS "endTime",
               tasks.address, tasks.status, NULL::text AS note,
               s.route_stop_id AS "stopId", to_char(s.route_date, 'YYYY-MM-DD') AS "routeDate",
               s.stop_order AS "stopOrder", s.location AS "stopLocation"
        FROM tasks LEFT JOIN rider_route_stop s ON s.route_stop_id = tasks.route_stop_id
        ORDER BY CASE WHEN $2::text IS NULL THEN s.route_date END,
                 CASE WHEN $2::text IS NULL THEN s.stop_order END,
                 tasks.task_date, tasks.task_time, tasks.sort_id, tasks.order_id`, [employeeId, type]);
      return rows;
    },

    async findTaskContact({ employeeId, type, assignmentId, orderId }) {
      const result = type === 'pickup'
        ? await db.query(`SELECT o.sender_phone AS phone
            FROM pickup p JOIN orders o ON o.pickup_id = p.pickup_id
            WHERE p.employee_id = $1 AND p.pickup_id = $2 AND o.order_id = $3`,
          [employeeId, assignmentId, orderId])
        : await db.query(`SELECT o.receiver_phone AS phone
            FROM delivery d JOIN parcel p ON p.parcel_id = d.parcel_id
            JOIN orders o ON o.order_id = p.order_id
            WHERE d.employee_id = $1 AND d.delivery_id = $2`, [employeeId, assignmentId]);
      return result.rows[0] || null;
    },

    async findByTrackingNumber(trackingNumber) {

      // 1. Find the parcel
      const parcelResult = await db.query(
        `SELECT
           p.parcel_id,
           p.tracking_number,
           o.service_type,
           p.destination_zone,
           p.current_status
         FROM parcel p JOIN orders o ON o.order_id = p.order_id
         WHERE p.tracking_number = $1`,
        [trackingNumber]
      );

      if (parcelResult.rows.length === 0) {
        return null;
      }

      const parcel = parcelResult.rows[0];

      // 2. Retrieve the parcel's tracking history
      const historyResult = await db.query(
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
        serviceType: parcel.service_type,
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
