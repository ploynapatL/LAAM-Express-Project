const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');
const { createDemoRepository } = require('../repositories/tracking-repository');

async function serve(t, options) {
  // Explicit unit-test fixture only; the application default is PostgreSQL.
  const server = createApp({ repository: createDemoRepository(), ...options }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return (path, init) => fetch(`http://127.0.0.1:${server.address().port}${path}`, init);
}
test('all frontend demo numbers return the public contract; no-update parcel exists', async t => {
  const request = await serve(t);
  for (const no of ['LAAM20260001', 'LAAM20260002', 'LAAM20260003']) {
    const response = await request(`/api/tracking/${no}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const parcel = await response.json();
    assert.equal(parcel.trackingNumber, no);
    assert.equal(typeof parcel.currentStatus, 'string');
    if (no.endsWith('3')) assert.deepEqual(parcel.history, []);
    else assert.equal(parcel.currentStatus, parcel.history[0].status);
  }
});
test('normalizes lowercase and whitespace; distinguishes invalid from missing', async t => {
  const request = await serve(t);
  assert.equal((await request('/api/tracking/%20laam20260001%20')).status, 200);
  assert.equal((await request('/api/tracking/UNKNOWN123')).status, 404);
  for (const no of ['ab', 'bad%21', 'A'.repeat(65), '%E0%A4%A']) {
    const response = await request(`/api/tracking/${no}`);
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});
test('sorts events, derives latest state, and excludes personal and employee fields', async t => {
  const request = await serve(t, { repository: { async findByTrackingNumber(no) {
    return { trackingNumber: no, currentStatus: 'Received', phone: 'private', employeeId: 5,
      recipientAddress: 'private', history: [
        { status: 'Received', location: 'A', timestamp: '2026-10-30T00:00:00Z', employeeId: 5 },
        { status: 'Delivered', location: 'B', timestamp: '2026-10-31T00:00:00Z', signature: 'private' }
      ] };
  } } });
  const parcel = await (await request('/api/tracking/TEST123')).json();
  assert.equal(parcel.currentStatus, 'Delivered');
  assert.equal(parcel.latestLocation, 'B');
  assert.equal(parcel.updatedAt, parcel.history[0].timestamp);
  assert.equal(parcel.phone, undefined);
  assert.equal(parcel.recipientAddress, undefined);
  assert.equal(parcel.employeeId, undefined);
  assert.deepEqual(Object.keys(parcel.history[0]).sort(), ['location', 'status', 'timestamp']);
});
test('limits repeated requests and returns retry instructions', async t => {
  const request = await serve(t, { rateLimit: 1 });
  assert.equal((await request('/api/tracking/LAAM20260001')).status, 200);
  const response = await request('/api/tracking/LAAM20260001');
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
});
test('repository errors return safe JSON', async t => {
  const request = await serve(t, { repository: { async findByTrackingNumber() { throw new Error('DB unavailable'); } } });
  const response = await request('/api/tracking/TEST123');
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Service is temporarily unavailable' });
});
test('approved CORS origin, read-only tracking, health, and starter endpoints', async t => {
  const request = await serve(t);
  const allowed = await request('/api/tracking/LAAM20260001', { headers: { Origin: 'http://localhost:8080' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:8080');
  const other = await request('/api/tracking/LAAM20260001', { headers: { Origin: 'https://unapproved.example' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
  assert.equal((await request('/api/tracking/LAAM20260001', { method: 'POST' })).status, 404);
  assert.equal((await (await request('/api/health')).json()).dataSource, 'demo');
  const created = await request('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Demo' }) });
  assert.equal(created.status, 201);
  assert.equal((await (await request('/api/items')).json()).length, 1);
  assert.equal((await request('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
});
