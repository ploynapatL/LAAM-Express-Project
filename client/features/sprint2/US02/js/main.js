import { getAccount, mountAccount } from "/assets/js/account.js";
import { getCustomerContact } from "../../US03/js/contact_api.js";
import { riderRequest } from "./rider_api.js";

const byId = id => document.getElementById(id);
const screens = { route: byId("route-screen"), detail: byId("detail-screen"), settings: byId("settings-screen") };
const nav = { route: byId("nav-route"), settings: byId("nav-settings") };
const routeList = byId("route-list");
const routeMessage = byId("route-message");
const contactMessage = byId("contact-message");
const contactContent = byId("contact-content");
const call = byId("call-customer");
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
const taskLabels = { pickup: "Pickup", delivery: "Delivery" };

let currentView = "route";
let openedFrom;
let contactRequest = 0;

function formatDate(date) {
  return dateFormat.format(new Date(date + "T00:00:00Z"));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function badgeClass(status) {
  const styles = {
    "In Transit": "status-in-progress",
    "Successful": "status-completed",
    "Delivered": "status-completed",
    "Failed": "status-cancelled",
    "Cancelled": "status-cancelled",
    "Returned": "status-cancelled"
  };
  return `status-badge ${styles[status] || "status-scheduled"}`;
}

function changeView(view, focus) {
  if (currentView === "detail" && view !== "detail") resetContact();
  currentView = view;
  for (const [name, screen] of Object.entries(screens)) screen.hidden = name !== view;
  const active = view === "detail" ? "route" : view;
  for (const [name, button] of Object.entries(nav)) {
    button.classList.toggle("active", name === active);
    if (name === active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
  focus.focus();
}

function resetContact() {
  contactRequest += 1;
  contactContent.hidden = true;
  call.removeAttribute("href");
  byId("customer-phone").textContent = "";
  contactMessage.hidden = false;
  contactMessage.className = "contact-message";
  contactMessage.textContent = "Loading customer contact…";
}

async function loadContact(taskId) {
  resetContact();
  const request = contactRequest;
  try {
    const { phone } = await getCustomerContact(taskId);
    if (request !== contactRequest) return;
    const number = phone.trim().replace(/[\s().-]/g, "");
    if (!/^\+?\d{6,15}$/.test(number)) throw new Error("Invalid customer phone number.");
    byId("customer-phone").textContent = phone;
    call.href = `tel:${number}`;
    contactContent.hidden = false;
    contactMessage.hidden = true;
  } catch (error) {
    if (request !== contactRequest) return;
    contactMessage.classList.add("error");
    contactMessage.textContent = error.message;
  }
}

function openDetails(task, stop, button) {
  openedFrom = button;
  const type = taskLabels[task.type];
  byId("detail-title").textContent = `${type} details`;
  byId("detail-task-id").textContent = task.taskId;
  const status = byId("detail-status");
  status.className = badgeClass(task.status);
  status.textContent = task.status;
  byId("detail-location-title").textContent = `${type} location`;
  byId("detail-location").textContent = task.address?.trim() || stop.location || "Location not available";
  byId("detail-appointment").hidden = !task.date;
  byId("detail-time").textContent = task.date
    ? [formatDate(task.date), task.startTime].filter(Boolean).join(" · ")
    : "";
  changeView("detail", byId("detail-title"));
  loadContact(task.taskId);
}

function renderTask(task, stop) {
  const row = element("li", "route-task");
  const name = element("div", "route-task-name");
  const type = taskLabels[task.type];
  name.append(element("span", `task-type task-${task.type}`, type), element("strong", "", task.taskId));
  if (task.date) {
    const date = task.date !== stop.routeDate ? formatDate(task.date) : "";
    const appointment = [date, task.startTime].filter(Boolean).join(" · ");
    if (appointment) name.append(element("span", "task-time", appointment));
  }
  const button = element("button", "view-details-btn", "View details");
  button.type = "button";
  button.setAttribute("aria-label", `View details for ${type.toLowerCase()} ${task.taskId}`);
  button.addEventListener("click", () => openDetails(task, stop, button));
  row.append(name, element("span", badgeClass(task.status), task.status), button);
  return row;
}

function renderStop(stop) {
  const card = element("article", "route-stop");
  const header = element("header", "stop-header");
  const title = stop.location || "Location not available";
  header.append(element("h3", "", stop.stopOrder ? `${stop.stopOrder}. ${title}` : title));
  const pickups = stop.tasks.filter(task => task.type === "pickup").length;
  const deliveries = stop.tasks.length - pickups;
  header.append(element("p", "stop-counts", `${pickups} pickup · ${deliveries} delivery`));
  const tasks = element("ul", "stop-tasks");
  tasks.append(...stop.tasks.map(task => renderTask(task, stop)));
  card.append(header, tasks);
  return card;
}

function renderRoute(stops) {
  const days = new Map();
  for (const stop of stops) {
    if (!days.has(stop.routeDate)) {
      const day = element("section", "route-day");
      day.append(element("h2", "", stop.routeDate ? formatDate(stop.routeDate) : "Unscheduled stops"));
      days.set(stop.routeDate, day);
    }
    days.get(stop.routeDate).append(renderStop(stop));
  }
  routeList.replaceChildren(...days.values());
  routeMessage.textContent = stops.length ? "" : "No assignments yet.";
  routeMessage.hidden = stops.length > 0;
}

nav.route.addEventListener("click", () => changeView("route", byId("route-title")));
nav.settings.addEventListener("click", () => changeView("settings", byId("settings-title")));
byId("back-to-assignments").addEventListener("click", () => changeView("route", openedFrom));

try {
  const account = await getAccount();
  if (account?.type !== "rider") {
    location.replace(account ? "/" : "/login");
  } else {
    mountAccount(account, { profile: byId("rider-profile") });
    const { stops } = await riderRequest("/api/riders/me/route");
    renderRoute(stops);
  }
} catch (error) {
  routeMessage.classList.add("state-error");
  routeMessage.textContent = error.message;
} finally {
  routeList.setAttribute("aria-busy", "false");
}
