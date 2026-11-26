const pool = require('../config/db');

function createAccounts(db = pool) {
  const accountFields = `a.account_id, a.username, a.email, a.password_hash,
    a.password_version, a.customer_id, a.employee_id, e.role`;

  return {
    async register({ username, email, phone, passwordHash }) {
      // Both inserts commit together. An existing customer is never linked by email alone.
      await db.query(`
        WITH new_customer AS (
          INSERT INTO customer (name, email, phone, customer_type)
          VALUES ($1, $2, $3, 'Member') RETURNING customer_id
        )
        INSERT INTO web_account (username, email, password_hash, customer_id)
        SELECT $1, $2, $4, customer_id FROM new_customer`,
      [username, email, phone, passwordHash]);
    },

    async findAccount(identifier) {
      const { rows } = await db.query(`
        SELECT ${accountFields}
        FROM web_account a LEFT JOIN employee e ON e.employee_id = a.employee_id
        WHERE lower(a.username) = $1 OR lower(a.email) = $1`, [identifier]);
      return rows[0];
    },

    async createSession(account, tokenHash, expiresAt) {
      await db.query('DELETE FROM web_session WHERE expires_at <= now()');
      const result = await db.query(`
        INSERT INTO web_session (token_hash, account_id, password_version, expires_at)
        SELECT $1, account_id, password_version, $2 FROM web_account
        WHERE account_id = $3 AND password_version = $4`,
      [tokenHash, expiresAt, account.account_id, account.password_version]);
      return result.rowCount === 1;
    },

    async findSession(tokenHash) {
      const { rows } = await db.query(`
        SELECT ${accountFields}
        FROM web_session s JOIN web_account a USING (account_id)
        LEFT JOIN employee e ON e.employee_id = a.employee_id
        WHERE s.token_hash = $1 AND s.expires_at > now()
          AND s.password_version = a.password_version`, [tokenHash]);
      return rows[0];
    },

    async deleteSession(tokenHash) {
      await db.query('DELETE FROM web_session WHERE token_hash = $1', [tokenHash]);
    },

    async changePassword(account, passwordHash, tokenHash, expiresAt) {
      const result = await db.query(`
        WITH updated AS (
          UPDATE web_account SET password_hash = $1, password_version = password_version + 1
          WHERE account_id = $2 AND password_version = $3
          RETURNING account_id, password_version
        )
        INSERT INTO web_session (token_hash, account_id, password_version, expires_at)
        SELECT $4, account_id, password_version, $5 FROM updated`,
      [passwordHash, account.account_id, account.password_version, tokenHash, expiresAt]);
      return result.rowCount === 1;
    },

    async findParcels(customerId) {
      const { rows } = await db.query(`
        SELECT p.tracking_number AS "trackingNumber", p.destination_zone AS destination,
               COALESCE(h.status, p.current_status) AS "currentStatus", h.timestamp AS "updatedAt"
        FROM orders o JOIN parcel p ON p.order_id = o.order_id
        LEFT JOIN LATERAL (
          SELECT status, timestamp FROM parcel_status_history
          WHERE parcel_id = p.parcel_id ORDER BY timestamp DESC, status_history_id DESC LIMIT 1
        ) h ON true
        WHERE o.customer_id = $1 ORDER BY o.order_date DESC, o.order_id DESC`, [customerId]);
      return rows;
    }
  };
}

module.exports = { createAccounts };
