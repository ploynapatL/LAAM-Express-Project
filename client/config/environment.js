
// Shared frontend environment configuration

const LOCAL_API_URL = 'http://localhost:3001';

// Replace with the actual Render Backend URL before deployment.
const PRODUCTION_API_URL = 'https://laam-express-backend-vabz.onrender.com';

const isLocal = [
  'localhost',
  '127.0.0.1',
  '[::1]'
].includes(window.location.hostname);

export const API_BASE_URL = isLocal
  ? LOCAL_API_URL
  : PRODUCTION_API_URL;

export const REQUEST_TIMEOUT_MS = 10000;
