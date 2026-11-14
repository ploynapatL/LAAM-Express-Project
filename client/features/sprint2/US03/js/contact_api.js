import { riderRequest } from "../../US02/js/rider_api.js";

export async function getCustomerContact(taskId) {
  if (typeof taskId !== "string" || !taskId) throw new Error("A valid task ID is required.");
  const contact = await riderRequest(`/api/tasks/${encodeURIComponent(taskId)}/contact`);
  if (contact.taskId !== taskId || typeof contact.phone !== "string" || !contact.phone.trim()) {
    throw new Error("Invalid contact information.");
  }
  return contact;
}
