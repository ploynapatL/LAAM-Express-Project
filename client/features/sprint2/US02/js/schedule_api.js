
/*
 * LAAM Express — Sprint 2 / US-02
 * Schedule Data Service
 */

import { CONFIG } from "./config.js";

import {
  getMockAssignments
} from "./mock_data.js";

// Temporary fictional rider credentials.
const DEMO_TOKENS = {
  pickup: "demo-pickup-001",
  delivery: "demo-delivery-002"
};


// const DEMO_TOKENS = {
//   pickup: "demo-pickup-001",
//   delivery: "demo-delivery-002",
//   unauthorized: "invalid-demo-token"
// };


// ==========================================
// FETCH ASSIGNMENTS FROM MOCK API
// ==========================================

async function fetchRiderAssignments(type) {
  const token = DEMO_TOKENS[CONFIG.DEMO_RIDER];

  if (!token) {
    throw new Error("Invalid demo rider configuration");
  }

  const endpoint =
    type === "pickup"
      ? "/api/riders/me/pickups"
      : "/api/riders/me/deliveries";

  const response = await fetch(
    `${CONFIG.API_BASE_URL}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve ${type} tasks: HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.assignments)) {
    throw new Error("Unexpected API response format");
  }

  return data.assignments;
}

// ==========================================
// PUBLIC DATA SERVICE
// ==========================================

export async function getAssignments() {

  if (CONFIG.DATA_SOURCE === "local") {
    return getMockAssignments();
  }

  if (CONFIG.DATA_SOURCE === "mock-api") {
    const [pickups, deliveries] = await Promise.all([
      fetchRiderAssignments("pickup"),
      fetchRiderAssignments("delivery")
    ]);

    return [...pickups, ...deliveries];
  }

  throw new Error("Unsupported data source");
}
