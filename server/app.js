const express = require('express');
const cors = require('cors');
const { createDemoRepository } = require('./repositories/tracking-repository');

// Temporary Intentionally references an undefined identifier
const week13LintDemo = undefinedVariableForCITest;

// Default rate limit settings : Code smells (2) Fix
const DEFAULT_RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 10_000;

// ---------------------------------------------------------------
// Format a parcel object for public API response: Code smells fix
function formatTrackingResponse(parcel) {
  // Include only public tracking history fields.
  const history = (
    Array.isArray(parcel.history) ? parcel.history : []
  )
    .map(event => ({
      status: event.status,
      location: event.location ?? null,
      timestamp: event.timestamp ?? null
    }))
    .sort(
      (a, b) =>
        (Date.parse(b.timestamp) || 0) -
        (Date.parse(a.timestamp) || 0)
    );

  const latest = history[0];

  return {
    trackingNumber: parcel.trackingNumber,
    currentStatus: latest?.status ?? parcel.currentStatus,
    latestLocation: latest?.location ?? parcel.latestLocation ?? null,
    updatedAt: latest?.timestamp ?? parcel.updatedAt ?? null,
    serviceType: parcel.serviceType ?? null,
    origin: parcel.origin ?? null,
    destination: parcel.destination ?? null,
    history
  };
}

// The DB teammate can inject a repository with async findByTrackingNumber(no).
function createApp({ repository = createDemoRepository(), rateLimit = DEFAULT_RATE_LIMIT, windowMs = RATE_LIMIT_WINDOW_MS, // Code smells fix: added default rate limit and windowMs values
  allowedOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5500', 'http://127.0.0.1:5500'] } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'laam-tracking', dataSource: repository.dataSource || 'custom' }));
  const items = [];
  app.get('/api/items', (_req, res) => res.json(items));
  app.post('/api/items', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'name is required' });
    const item = { id: items.length + 1, name };
    items.push(item);
    res.status(201).json(item);
  });
  const requests = new Map();
  app.use('/api/tracking', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const now = Date.now();
    for (const [ip, bucket] of requests) if (bucket.resetAt <= now) requests.delete(ip);
    const ip = req.ip;
    const bucket = requests.get(ip) || { count: 0, resetAt: now + windowMs };
    if (bucket.count >= rateLimit || (!requests.has(ip) && requests.size >= MAX_TRACKED_IPS)) { // Code smells fix: added check for max tracked IPs
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    bucket.count++;
    requests.set(ip, bucket);
    next();
  });

  app.get('/api/tracking/:trackingNo', async (req, res, next) => {

    const trackingNumber = req.params.trackingNo.trim().toUpperCase();

    if (!/^[A-Z0-9-]{4,64}$/.test(trackingNumber)) return res.status(400).json({ error: 'Tracking number must contain 4–64 letters, numbers or hyphens.' });
    try {
      const parcel = await repository.findByTrackingNumber(trackingNumber);
      if (!parcel) return res.status(404).json({ error: 'Tracking number not found' });
      // Allowlist public fields; never send an entire DB row to the browser.
      
      res.json(formatTrackingResponse(parcel));
      
      // const history = (Array.isArray(parcel.history) ? parcel.history : []).map(event => ({
      //   status: event.status, location: event.location ?? null, timestamp: event.timestamp ?? null
      // })).sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));

      // const latest = history[0];

      // res.json({
      //   trackingNumber: parcel.trackingNumber,
      //   currentStatus: latest?.status ?? parcel.currentStatus,
      //   latestLocation: latest?.location ?? parcel.latestLocation ?? null,
      //   updatedAt: latest?.timestamp ?? parcel.updatedAt ?? null,
      //   serviceType: parcel.serviceType ?? null,
      //   origin: parcel.origin ?? null,
      //   destination: parcel.destination ?? null,
      //   history
      // });
      // -> code smells fix: moved to formatTrackingResponse() function above

    } catch (error) { next(error); }
  });

  app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));

  app.use((error, _req, res, _next) => {
    if (error instanceof URIError || error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
    console.error('API request failed:', error.message);
    res.status(500).json({ error: 'Tracking service is temporarily unavailable' });
  });

  return app;
}

module.exports = { createApp };