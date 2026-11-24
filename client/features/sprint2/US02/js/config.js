
// Import shared environment configuration.
import {
  API_BASE_URL,
  REQUEST_TIMEOUT_MS
} from '../../../../config/environment.js';

// Real PostgreSQL API only; no automatic fallback to fictional data.
export const CONFIG = {
  API_BASE_URL,
  REQUEST_TIMEOUT_MS
};
