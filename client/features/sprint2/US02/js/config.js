
/*
 * LAAM Express — US-02 Configuration
 *
 * DATA_SOURCE:
 * "local"    = Frontend mock-data.js
 * "mock-api" = Temporary Express server
 */

export const CONFIG = {
  DATA_SOURCE: "mock-api",

  API_BASE_URL: "http://127.0.0.1:3002",

  // For mock API testing only.
  // Options: "pickup" or "delivery" or "unauthorized"
  DEMO_RIDER: "pickup"
};
