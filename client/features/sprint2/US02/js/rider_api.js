import { CONFIG } from "./config.js";

// Memory only: never put credentials in a URL, source code or browser storage.
let riderToken = "";
export function setRiderToken(token) { riderToken = token.trim(); }

export async function riderRequest(path) {
  if (!riderToken) throw new Error("Enter your rider access token above to load assignments.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${riderToken}` },
      cache: "no-store", signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed: HTTP ${response.status}`);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw error;
  } finally { clearTimeout(timeout); }
}
