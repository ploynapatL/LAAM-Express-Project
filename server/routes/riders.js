const express = require('express');
const { timingSafeEqual } = require('node:crypto');

// Temporary server-managed credentials: identity is never accepted from a request ID.
// Replace with the team's login/session provider when its contract is agreed.
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

function createRiderRouter({ repository, riderTokens }) {
  const router = express.Router();
  const roles = { pickup: 'Pickup Rider', delivery: 'Delivery Rider' };
  const credentials = Object.entries(riderTokens).map(([token, id]) => [Buffer.from(token), id]);
  async function authenticate(req, res, next) {
    res.set('Cache-Control', 'no-store');
    res.vary('Authorization');
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('Authorization') || '');
    const supplied = Buffer.from(match?.[1] || '');
    const credential = credentials.find(([token]) => token.length === supplied.length && timingSafeEqual(token, supplied));
    if (!match || !credential) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const employee = await repository.findEmployee(credential[1]);
      if (!employee || !Object.values(roles).includes(employee.role)) {
        return res.status(403).json({ error: 'Rider access required' });
      }
      req.rider = employee;
      next();
    } catch (error) { next(error); }
  }

  router.get('/riders/me', authenticate, (req, res) => {
    res.json({ riderId: req.rider.employee_id, role: req.rider.role });
  });
  for (const type of Object.keys(roles)) {
    router.get(`/riders/me/${type === 'pickup' ? 'pickups' : 'deliveries'}`, authenticate, async (req, res, next) => {
      try {
        // The UI loads both tabs. The other rider role has no assignments of this type.
        const assignments = req.rider.role === roles[type]
          ? await repository.findAssignments(req.rider.employee_id, type) : [];
        res.json({ riderId: req.rider.employee_id, assignments });
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
    if (req.rider.role !== roles[type]) return res.status(403).json({ error: 'Task type is not authorized' });
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
