import { API_BASE_URL, REQUEST_TIMEOUT_MS, USE_MOCK_API } from './config.js';
import { MOCK_PARCELS } from './mock-tracking.js';

export class TrackingError extends Error {
  constructor(code, message) { super(message); this.name = 'TrackingError'; this.code = code; }
}

/** Lookup is read-only and deliberately sends no authentication credentials. */
export async function getTracking(trackingNo, { signal } = {}) {
  const value = normalizeTrackingNumber(trackingNo);
  if (!isValidTrackingNumber(value)) throw new TrackingError('INVALID', 'Enter a valid tracking number (4–64 letters, numbers or hyphens).');
  if (USE_MOCK_API) {
    if (signal?.aborted) throw new TrackingError('CANCELLED', 'Lookup cancelled.');
    const record = MOCK_PARCELS[value];
    if (!record) throw new TrackingError('NOT_FOUND', 'No parcel was found for this tracking number. Check the number and try again.');
    return parseTrackingResponse(record);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const relayAbort = () => controller.abort();
  signal?.addEventListener('abort', relayAbort, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(`${API_BASE_URL}/api/tracking/${encodeURIComponent(value)}`, {
      method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal,
      credentials: 'omit', cache: 'no-store'
    });
    if (response.status === 404) throw new TrackingError('NOT_FOUND', 'No parcel was found for this tracking number. Check the number and try again.');
    if (response.status === 429) throw new TrackingError('RATE_LIMIT', 'Too many requests. Please try again later.');
    if (!response.ok) throw new TrackingError('SERVER', 'Tracking is temporarily unavailable. Please try again.');
    let payload;
    try { payload = await response.json(); } catch { throw new TrackingError('BAD_RESPONSE', 'The tracking service returned invalid data.'); }
    return parseTrackingResponse(payload);
  } catch (error) {
    if (error instanceof TrackingError) throw error;
    if (controller.signal.aborted) throw new TrackingError(signal?.aborted ? 'CANCELLED' : 'TIMEOUT', 'The request timed out. Please try again.');
    throw new TrackingError('NETWORK', 'Unable to connect to the tracking service. Check your connection.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', relayAbort);
  }
}

export function normalizeTrackingNumber(value) { return String(value ?? '').trim().toUpperCase(); }
export function isValidTrackingNumber(value) { return /^[A-Z0-9-]{4,64}$/.test(value); }
export function parseTrackingResponse(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.trackingNumber !== 'string' || typeof data.currentStatus !== 'string') {
    throw new TrackingError('BAD_RESPONSE', 'The tracking service returned incomplete parcel information.');
  }
  const events = Array.isArray(data.history) ? data.history : [];
  return {
    trackingNumber: data.trackingNumber,
    currentStatus: data.currentStatus,
    latestLocation: typeof data.latestLocation === 'string' ? data.latestLocation : null,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    serviceType: typeof data.serviceType === 'string' ? data.serviceType : null,
    origin: typeof data.origin === 'string' ? data.origin : null,
    destination: typeof data.destination === 'string' ? data.destination : null,
    history: events.filter(e => e && typeof e.status === 'string').map(e => ({
      status: e.status, location: typeof e.location === 'string' ? e.location : null,
      timestamp: typeof e.timestamp === 'string' ? e.timestamp : null
    })).sort((a, b) => (Date.parse(b.timestamp || '') || 0) - (Date.parse(a.timestamp || '') || 0))
  };
}
