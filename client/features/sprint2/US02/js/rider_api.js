import { CONFIG } from "./config.js";

export async function riderRequest(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
      credentials: "same-origin",
      cache: "no-store", signal: controller.signal
    });
    const data = await response.json();
    if (response.status === 401) location.replace("/login");
    if (!response.ok) throw new Error(data.error || `Request failed: HTTP ${response.status}`);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Request timed out. Please try again.");
    throw error;
  } finally { clearTimeout(timeout); }
}
