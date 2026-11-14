import { riderRequest } from "./rider_api.js";

export async function getAssignments() {
  const [pickups, deliveries] = await Promise.all([
    riderRequest("/api/riders/me/pickups"),
    riderRequest("/api/riders/me/deliveries")
  ]);
  if (!Array.isArray(pickups.assignments) || !Array.isArray(deliveries.assignments)) {
    throw new Error("Unexpected assignment response format");
  }
  return [...pickups.assignments, ...deliveries.assignments];
}
