
// Import and re-export shared environment configuration.
export {
  API_BASE_URL,
  REQUEST_TIMEOUT_MS
} from '../../../config/environment.js';

/** True: offline fictional data; False: real API at API_BASE_URL. */
export const USE_MOCK_API = false;

/** Fictional tracking numbers for demonstration. */
export const DEMO_TRACKING_NUMBERS = ['LAAM001', 'LAAM002', 'LAAM003'];
