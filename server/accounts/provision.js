require('dotenv').config();
const { randomBytes } = require('node:crypto');
const pool = require('../config/db');
const { hashPassword } = require('./passwords');
const { validateIdentity, RIDER_ROLES } = require('../routes/accounts');

async function provision() {
  const [type, id, username, email] = process.argv.slice(2);
  if (!['rider', 'customer'].includes(type) || !/^[1-9]\d*$/.test(id) || Number(id) > 2147483647 ||
      !validateIdentity({ username, email })) {
    throw new Error('Usage: node accounts/provision.js <rider|customer> <employee-or-customer-id> <username> <email>');
  }
  const password = randomBytes(18).toString('base64url');
  const hash = await hashPassword(password);
  const result = type === 'rider'
    ? await pool.query(`
        INSERT INTO web_account (username, email, password_hash, employee_id)
        SELECT $1, $2, $3, employee_id FROM employee
        WHERE employee_id = $4 AND role = ANY($5)`, [username, email.toLowerCase(), hash, id, RIDER_ROLES])
    : await pool.query(`
        INSERT INTO web_account (username, email, password_hash, customer_id)
        SELECT $1, $2, $3, customer_id FROM customer WHERE customer_id = $4`,
      [username, email.toLowerCase(), hash, id]);

  if (result.rowCount !== 1) throw new Error('No matching customer or eligible rider was found.');
  console.log(`Initial password for ${username}: ${password}`);
}

provision().catch(error => {
  console.error(error.code === '23505' ? 'This person, username, or email already has an account.' : error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
