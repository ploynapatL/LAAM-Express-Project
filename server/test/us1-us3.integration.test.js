// Prepared for a real, dedicated PostgreSQL test database. No database mocks.
require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');
const { createPostgresRepository } = require('../repositories/postgres-repositories');
const pool = require('../config/db');

test('US1-US3 against real PostgreSQL (transaction rolled back)', {
  skip: process.env.RUN_DB_TESTS !== '1'
}, async t => {
  assert.match(process.env.DB_NAME || '', /_test$/, 'Use a dedicated database ending in _test');
  const db = await pool.connect();
  t.after(async () => { try { await db.query('ROLLBACK'); } finally { db.release(); await pool.end(); } });
  await db.query('BEGIN');
  const insert = async (sql, params = []) => (await db.query(sql, params)).rows[0];
  const pickupRider = (await insert("INSERT INTO employee (name, role) VALUES ('Integration pickup', 'Pickup Rider') RETURNING employee_id")).employee_id;
  const otherRider = (await insert("INSERT INTO employee (name, role) VALUES ('Other pickup', 'Pickup Rider') RETURNING employee_id")).employee_id;
  const deliveryRider = (await insert("INSERT INTO employee (name, role) VALUES ('Integration delivery', 'Delivery Rider') RETURNING employee_id")).employee_id;
  const staff = (await insert("INSERT INTO employee (name, role) VALUES ('Non rider', 'Hub Staff') RETURNING employee_id")).employee_id;
  const customer = (await insert("INSERT INTO customer (name) VALUES ('Integration customer') RETURNING customer_id")).customer_id;
  const pickup = (await insert(`INSERT INTO pickup (employee_id, appointment_date, appointment_time, pickup_location)
    VALUES ($1, '2026-11-17', '10:00', 'Integration location') RETURNING pickup_id`, [pickupRider])).pickup_id;
  async function order(sender, receiver) {
    return (await insert(`INSERT INTO orders (customer_id, pickup_id, sender_phone, receiver_phone, receiver_address, service_type)
      VALUES ($1, $2, $3, $4, 'Integration destination', 'Express') RETURNING order_id`,
    [customer, pickup, sender, receiver])).order_id;
  }
  const firstOrder = await order('0811111111', '0822222222');
  const secondOrder = await order('0833333333', null);
  const unrelatedOrder = (await insert('INSERT INTO orders (customer_id) VALUES ($1) RETURNING order_id', [customer])).order_id;
  const tracking = `IT-${require('node:crypto').randomUUID()}`.toUpperCase();
  const parcel = (await insert(`INSERT INTO parcel (order_id, tracking_number, parcel_type)
    VALUES ($1, $2, 'Box') RETURNING parcel_id`, [firstOrder, tracking])).parcel_id;
  const delivery = (await insert('INSERT INTO delivery (parcel_id, employee_id) VALUES ($1, $2) RETURNING delivery_id', [parcel, deliveryRider])).delivery_id;
  const token = 'integration-pickup-secret-at-least-32-characters';
  const otherToken = 'integration-other-secret-at-least-32-characters';
  const deliveryToken = 'integration-delivery-secret-at-least-32-characters';
  const staffToken = 'integration-staff-secret-at-least-32-characters';
  const server = createApp({ repository: createPostgresRepository(db), riderTokens: {
    [token]: pickupRider, [otherToken]: otherRider, [deliveryToken]: deliveryRider, [staffToken]: staff
  } }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, auth = token) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    headers: auth ? { Authorization: `Bearer ${auth}` } : {}
  });
  const firstTask = `P-${pickup}-O-${firstOrder}`;
  const secondTask = `P-${pickup}-O-${secondOrder}`;

  await t.test('US1 returns real parcel and empty history; service comes from orders', async () => {
    const response = await request(`/api/tracking/${tracking}`, null);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.serviceType, 'Express');
    assert.deepEqual(data.history, []);
    assert.equal(data.currentStatus, 'Order Created');
    assert.equal(data.phone, undefined);
    assert.equal((await request('/api/tracking/UNKNOWN-INTEGRATION', null)).status, 404);
  });
  await t.test('authentication and role checks reject absent, invalid and non-rider credentials', async () => {
    for (const path of ['/api/riders/me/pickups', `/api/tasks/${firstTask}/contact`]) {
      assert.equal((await request(path, null)).status, 401);
      assert.equal((await request(path, 'invalid')).status, 401);
      assert.equal((await request(path, staffToken)).status, 403);
    }
  });
  await t.test('US2 scopes assignments, handles multiple orders and preserves missing schedule', async () => {
    const response = await request('/api/riders/me/pickups');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const tasks = (await response.json()).assignments;
    assert.deepEqual(tasks.map(task => task.taskId), [firstTask, secondTask]);
    assert.equal(tasks[0].date, '2026-11-17');
    assert.equal(tasks[0].startTime, '10:00');
    assert.equal(tasks[0].endTime, null);
    assert.equal(tasks[0].phone, undefined);
    assert.deepEqual((await (await request('/api/riders/me/pickups', otherToken)).json()).assignments, []);
    assert.deepEqual((await (await request('/api/riders/me/deliveries')).json()).assignments, []);
    const deliveries = (await (await request('/api/riders/me/deliveries', deliveryToken)).json()).assignments;
    assert.equal(deliveries[0].taskId, `D-${delivery}`);
    assert.equal(deliveries[0].date, null);
  });
  await t.test('US3 returns sender/receiver phones and prevents other-rider and forged-order access', async () => {
    const response = await request(`/api/tasks/${firstTask}/contact`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { taskId: firstTask, phone: '0811111111' });
    assert.equal((await request(`/api/tasks/${secondTask}/contact`)).status, 200);
    assert.equal((await request(`/api/tasks/${firstTask}/contact`, otherToken)).status, 404);
    assert.equal((await request(`/api/tasks/P-${pickup}-O-${unrelatedOrder}/contact`)).status, 404);
    assert.equal((await request(`/api/tasks/${firstTask}/contact`, deliveryToken)).status, 403);
    assert.equal((await request('/api/tasks/P-2147483648-O-1/contact')).status, 400);
    const contact = await request(`/api/tasks/D-${delivery}/contact`, deliveryToken);
    assert.equal(contact.status, 200);
    assert.deepEqual(await contact.json(), { taskId: `D-${delivery}`, phone: '0822222222' });
    await db.query('UPDATE orders SET receiver_phone = NULL WHERE order_id = $1', [firstOrder]);
    assert.equal((await request(`/api/tasks/D-${delivery}/contact`, deliveryToken)).status, 404);
    // Reassignment immediately revokes the former rider's access.
    await db.query('UPDATE pickup SET employee_id = $1 WHERE pickup_id = $2', [otherRider, pickup]);
    assert.equal((await request(`/api/tasks/${firstTask}/contact`)).status, 404);
  });
});
