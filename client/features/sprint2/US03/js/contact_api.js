
/*
 * ==========================================
 * SPRINT 2 — US-03
 * Customer Contact Retrieval Service
 *
 * Retrieves the phone number associated
 * with an assignment task ID.
 * ==========================================
 */

import { CONTACT_CONFIG } from "./config.js";

// ==========================================
// 1. LOCAL FICTIONAL CONTACT DATA
// ==========================================

// All fictional customers use the same number.
// This is for frontend simulation only.

const DEMO_PHONE_NUMBER = "999-999-9999";


// ==========================================
// 2. LOCAL MOCK RETRIEVAL
// ==========================================

async function getLocalContact(taskId) {
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  // No database or server is used here.
  // The local mode does not verify authorization.

  return {
    taskId,
    phone: DEMO_PHONE_NUMBER
  };
}


// ==========================================
// 3. MOCK API RETRIEVAL
// ==========================================

// Development-only credentials.
// Never use fixed tokens for real authentication.

const DEMO_TOKENS = {
  pickup: "demo-pickup-001",
  delivery: "demo-delivery-002"
};

async function getApiContact(taskId) {
  const token =
    DEMO_TOKENS[CONTACT_CONFIG.DEMO_RIDER];

  if (!token) {
    throw new Error("Invalid demo rider configuration.");
  }

  const response = await fetch(
    `${CONTACT_CONFIG.API_BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/contact`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: "no-store"
    }
  );

  if (response.status === 401) {
    throw new Error("Authentication required.");
  }

  if (response.status === 403) {
    throw new Error(
      "You are not authorized to view this contact."
    );
  }

  if (response.status === 404) {
    throw new Error("Assignment not found.");
  }

  if (!response.ok) {
    throw new Error(
      "Unable to retrieve customer contact."
    );
  }

  const contact = await response.json();

  if (
    contact.taskId !== taskId ||
    typeof contact.phone !== "string" ||
    !contact.phone.trim()
  ) {
    throw new Error("Invalid contact information.");
  }

  return contact;
}


// ==========================================
// 4. PUBLIC CONTACT SERVICE
// ==========================================

export async function getCustomerContact(taskId) {
  if (!taskId || typeof taskId !== "string") {
    throw new Error("A valid task ID is required.");
  }

  if (CONTACT_CONFIG.DATA_SOURCE === "local") {
    return getLocalContact(taskId);
  }

  if (CONTACT_CONFIG.DATA_SOURCE === "mock-api") {
    return getApiContact(taskId);
  }

  throw new Error("Unsupported contact data source.");
}

/* END — SPRINT 2 / US-03 */
