const express = require('express');
const { timingSafeEqual } = require('node:crypto');
const { RIDER_ROLES } = require('./accounts');

// Optional Bearer credentials for existing API clients. Website riders use sessions.
function parseRiderTokens(value) {
  if (!value) return {};
  let tokens;
  try { tokens = JSON.parse(value); }
  catch { throw new Error('RIDER_TOKENS_JSON must be valid JSON'); }
  if (!tokens || Array.isArray(tokens) || typeof tokens !== 'object' ||
      Object.entries(tokens).some(([token, id]) => token.length < 32 || /\s/.test(token) ||
        !Number.isInteger(id) || id < 1 || id > 2147483647)) {
    throw new Error('RIDER_TOKENS_JSON must map opaque tokens (32+ characters, no whitespace) to employee IDs');
  }
  return tokens;
}

function groupStops(assignments) {
  const groups = new Map();
  for (const { stopId, routeDate, stopOrder, stopLocation, ...task } of assignments) {
    const address = task.address?.trim();
    const key = stopId ? `stop:${stopId}`
      : address ? `address:${address.replace(/\s+/g, ' ').toLowerCase()}` : task.taskId;
    if (!groups.has(key)) {
      groups.set(key, {
        stopId, routeDate, stopOrder, location: stopLocation || address || null, tasks: []
      });
    }
    groups.get(key).tasks.push(task);
  }
  return [...groups.values()];
}

function createRiderRouter({ repository, riderTokens, sessionAccount }) {
  const router = express.Router();
  const credentials = Object.entries(riderTokens).map(([token, id]) => [Buffer.from(token), id]);
  async function authenticate(req, res, next) {
    res.set('Cache-Control', 'no-store');
    res.vary('Authorization');
    res.vary('Cookie');
    const authorization = req.get('Authorization');
    const match = /^Bearer ([^\s]+)$/i.exec(authorization || '');
    const supplied = Buffer.from(match?.[1] || '');
    const credential = credentials.find(([token]) => token.length === supplied.length && timingSafeEqual(token, supplied));
    try {
      const account = authorization ? null : await sessionAccount(req);
      if (!credential && !account) {
        res.set('WWW-Authenticate', 'Bearer');
        return res.status(401).json({ error: 'Authentication required' });
      }
      const employee = credential ? await repository.findEmployee(credential[1]) : account;
      if (!RIDER_ROLES.includes(employee?.role)) {
        return res.status(403).json({ error: 'Rider access required' });
      }
      req.rider = employee;
      next();
    } catch (error) { next(error); }
  }

  router.get('/riders/me', authenticate, (req, res) => {
    res.json({ riderId: req.rider.employee_id, role: req.rider.role });
  });
  router.get('/riders/me/route', authenticate, async (req, res, next) => {
    try {
      const riderId = req.rider.employee_id;
      res.json({ riderId, stops: groupStops(await repository.findAssignments(riderId)) });
    } catch (error) { next(error); }
  });

  for (const [path, type] of [['pickups', 'pickup'], ['deliveries', 'delivery']]) {
    router.get(`/riders/me/${path}`, authenticate, async (req, res, next) => {
      try {
        const riderId = req.rider.employee_id;
        const rows = await repository.findAssignments(riderId, type);
        const assignments = rows.map(({ taskId, date, startTime, endTime, address, status, note }) => ({
          taskId, type, date, startTime, endTime, address, status, note
        }));
        res.json({ riderId, assignments });
      } catch (error) { next(error); }
    });
  }
  router.get('/tasks/:taskId/contact', authenticate, async (req, res, next) => {
    const taskId = req.params.taskId;
    const match = /^(?:P-([1-9]\d*)-O-([1-9]\d*)|D-([1-9]\d*))$/.exec(taskId);
    if (!match || match.slice(1).some(id => id && (!Number.isSafeInteger(Number(id)) || Number(id) > 2147483647))) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    const type = match[1] ? 'pickup' : 'delivery';
    try {
      // Ownership is part of the SQL WHERE clause, including pickup/order association.
      const contact = await repository.findTaskContact({
        employeeId: req.rider.employee_id, type,
        assignmentId: Number(match[1] || match[3]), orderId: Number(match[2])
      });
      if (!contact) return res.status(404).json({ error: 'Assignment not found or not assigned to you' });
      const phone = contact.phone?.trim();
      if (!phone) return res.status(404).json({ error: 'Customer phone number is unavailable' });
      res.json({ taskId, phone });
    } catch (error) { next(error); }
  });
  return router;
}
module.exports = { createRiderRouter, parseRiderTokens };
