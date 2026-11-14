
/*
 * LAAM Express — Sprint 2 / US-02
 * Rider Schedule Frontend Controller
 */

import { getAssignments } from "./schedule_api.js";
import { setRiderToken } from "./rider_api.js";

/*
 * SPRINT 2 — US-03
 * Import customer contact retrieval.
 */
import { getCustomerContact } from "../../US03/js/contact_api.js";


// ==========================================
// 1. ELEMENT REFERENCES
// ==========================================

const screens = {
  pickup: document.getElementById("pickup-screen"),
  delivery: document.getElementById("delivery-screen"),
  detail: document.getElementById("detail-screen"),
  settings: document.getElementById("settings-screen")
};

const navButtons = {
  pickup: document.getElementById("nav-pickup"),
  delivery: document.getElementById("nav-delivery"),
  settings: document.getElementById("nav-settings")
};

const pickupList = document.getElementById("pickup-list");
const deliveryList = document.getElementById("delivery-list");

const detailPlaceholder =
  document.getElementById("detail-placeholder");

const detailContent =
  document.getElementById("detail-content");

// ==========================================
// 2. APPLICATION STATE
// ==========================================

let assignments = [];
let currentView = "pickup";
let previousAssignmentView = "pickup";
let selectedTask = null;

// ==========================================
// 3. SCREEN NAVIGATION
// ==========================================

function updateLayout() {
  // One screen at a time on all device sizes.
  Object.entries(screens).forEach(([name, screen]) => {
    screen.hidden = name !== currentView;
  });
}

function updateNavigation() {
  const activeView =
    currentView === "detail"
      ? previousAssignmentView
      : currentView;

  Object.entries(navButtons).forEach(([name, button]) => {
    const active = name === activeView;

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}


function changeView(view) {

  // ======================================
  // SPRINT 2 — US-03
  // Clear customer contact when leaving
  // the Assignment Detail screen.
  // ======================================
  if (currentView === "detail" && view !== "detail") {
    resetCustomerContact();
  }

  currentView = view;
  updateLayout();
  updateNavigation();
}



function openTaskDetails(taskId) {
  const task = assignments.find(
    item => item.taskId === taskId
  );

  if (!task) {
    return;
  }

  selectedTask = task;
  previousAssignmentView = task.type;

  // US-02: Display assignment details
  renderTaskDetails(task);
  changeView("detail");

  // ======================================
  // SPRINT 2 — US-03
  // Retrieve the customer's phone number
  // for the selected task.
  // ======================================
  loadCustomerContact(task.taskId);
}




function backToAssignments() {
  // US-03 cleanup is handled by changeView().
  changeView(previousAssignmentView);
}


// ==========================================
// 4. HELPERS
// ==========================================

function formatDate(dateString) {
  if (!dateString) return "Schedule date not available";
  // Avoid UTC timezone shifts for YYYY-MM-DD.
  const [year, month, day] =
    dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatTaskTime(task) {
  if (!task.startTime) return "Schedule time not available";
  return task.endTime ? `${task.startTime} – ${task.endTime}` : task.startTime;
}

function statusClass(status) {
  const classes = {
    "Scheduled": "status-scheduled",
    "In Progress": "status-in-progress",
    "Completed": "status-completed",
    "Cancelled": "status-cancelled",
    "Successful": "status-completed",
    "Delivered": "status-completed",
    "In Transit": "status-in-progress",
    "Failed": "status-cancelled"
  };

  return classes[status] || "status-scheduled";
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

// ==========================================
// 5. RENDER ASSIGNMENT CARDS
// ==========================================

function createAssignmentCard(task) {
  const card = createElement(
    "article",
    "assignment-card"
  );

  const header = createElement(
    "div",
    "assignment-card-header"
  );

  const title = createElement(
    "h3",
    "",
    task.taskId
  );

  const badge = createElement(
    "span",
    `status-badge ${statusClass(task.status)}`,
    task.status
  );

  header.append(title, badge);

  const info = createElement(
    "div",
    "assignment-info"
  );

  const dateLine = createElement(
    "p",
    "",
    `📅 ${formatDate(task.date)}`
  );

  const timeLine = createElement(
    "p",
    "",
    `🕒 ${formatTaskTime(task)}`
  );

  const addressLine = createElement(
    "p",
    "",
    `📍 ${task.address || "Location not available"}`
  );

  info.append(dateLine, timeLine, addressLine);

  const footer = createElement(
    "div",
    "assignment-card-footer"
  );

  const detailButton = createElement(
    "button",
    "view-details-btn",
    "View Details →"
  );

  detailButton.type = "button";
  detailButton.addEventListener("click", () => {
    openTaskDetails(task.taskId);
  });

  footer.appendChild(detailButton);

  card.append(header, info, footer);

  return card;
}

function renderAssignments(type, container) {
  const filtered = assignments
    .filter(task => task.type === type)
    .sort((a, b) => {
      const first = `${a.date || "9999-12-31"}T${a.startTime || ""}`;
      const second = `${b.date || "9999-12-31"}T${b.startTime || ""}`;
      return first.localeCompare(second);
    });

  container.replaceChildren();

  if (filtered.length === 0) {
    const message = createElement(
      "div",
      "state-message"
    );

    message.appendChild(
      createElement(
        "p",
        "",
        `No ${type} assignments scheduled.`
      )
    );

    container.appendChild(message);
    return;
  }

  filtered.forEach(task => {
    container.appendChild(createAssignmentCard(task));
  });
}

// ==========================================
// 6. RENDER ASSIGNMENT DETAILS
// ==========================================

function renderTaskDetails(task) {
  detailPlaceholder.hidden = true;
  detailContent.hidden = false;

  document.getElementById(
    "detail-task-id"
  ).textContent = task.taskId;

  const statusElement =
    document.getElementById("detail-status");

  statusElement.textContent = task.status;
  statusElement.className =
    `status-badge ${statusClass(task.status)}`;

  document.getElementById(
    "detail-date"
  ).textContent = formatDate(task.date);

  document.getElementById(
    "detail-time"
  ).textContent =
    formatTaskTime(task);

  document.getElementById(
    "detail-location-title"
  ).textContent =
    task.type === "pickup"
      ? "Pickup Location"
      : "Delivery Location";

  document.getElementById(
    "detail-location"
  ).textContent = task.address || "Location not available";

  document.getElementById(
    "detail-note"
  ).textContent =
    task.note || "No note provided.";

  // US3 retrieves contact separately after this assignment is selected.
}


/*
 * ==========================================
 * SPRINT 2 — US-03
 * Customer Contact UI Controller
 * ==========================================
 */

let contactRequestId = 0;

const contactMessage =
  document.getElementById("us03-contact-message");

const contactContent =
  document.getElementById("us03-contact-content");

const phoneNumberElement =
  document.getElementById("us03-phone-number");

const callButton =
  document.getElementById("us03-call-button");


// Clear previous contact and invalidate
// any outstanding contact request.
function resetCustomerContact() {
  contactRequestId += 1;

  contactContent.hidden = true;
  callButton.hidden = true;
  callButton.removeAttribute("href");

  phoneNumberElement.textContent = "—";

  contactMessage.hidden = false;
  contactMessage.className = "contact-message";
  contactMessage.textContent =
    "Customer contact information is not loaded yet.";
}


// Retrieve contact for the selected task.
async function loadCustomerContact(taskId) {
  resetCustomerContact();

  const requestId = contactRequestId;

  contactMessage.textContent =
    "Loading customer contact...";

  try {
    const contact = await getCustomerContact(taskId);

    // An old request must not update a new task.
    if (requestId !== contactRequestId) {
      return;
    }

    const phone = contact.phone.trim();

    // Convert display format into a tel URI.
    const dialNumber = phone.replace(
      /[\s().-]/g,
      ""
    );

    if (!/^\+?\d{6,15}$/.test(dialNumber)) {
      throw new Error("Invalid customer phone number.");
    }

    phoneNumberElement.textContent = phone;
    callButton.href = `tel:${dialNumber}`;

    contactContent.hidden = false;
    callButton.hidden = false;
    contactMessage.hidden = true;

  } catch (error) {
    if (requestId !== contactRequestId) {
      return;
    }

    console.error(
      "US-03 contact retrieval failed:",
      error
    );

    contactContent.hidden = true;
    callButton.hidden = true;
    callButton.removeAttribute("href");

    phoneNumberElement.textContent = "—";

    contactMessage.hidden = false;
    contactMessage.className = "contact-message error";
    contactMessage.textContent =
      error.message || "Unable to load customer contact.";
  }
}

/* END — SPRINT 2 / US-03 */


// ==========================================
// 7. NAVIGATION EVENT LISTENERS
// ==========================================

navButtons.pickup.addEventListener("click", () => {
  changeView("pickup");
});

navButtons.delivery.addEventListener("click", () => {
  changeView("delivery");
});

navButtons.settings.addEventListener("click", () => {
  changeView("settings");
});

document.getElementById(
  "back-to-pickup"
).addEventListener("click", () => {
  changeView("pickup");
});

document.getElementById(
  "back-to-assignments"
).addEventListener("click", () => {
  backToAssignments();
});

// ==========================================
// 8. INITIALIZE
// ==========================================

let assignmentRequestId = 0;
async function initialize() {
  const requestId = ++assignmentRequestId;
  resetCustomerContact();
  selectedTask = null;
  assignments = [];
  detailContent.hidden = true;
  detailPlaceholder.hidden = false;
  for (const list of [pickupList, deliveryList]) list.textContent = "Loading assignments...";
  changeView("pickup");

  pickupList.setAttribute("aria-busy", "true");
  deliveryList.setAttribute("aria-busy", "true");

  try {
    const loaded = await getAssignments();
    if (requestId !== assignmentRequestId) return;
    assignments = loaded;

    renderAssignments("pickup", pickupList);
    renderAssignments("delivery", deliveryList);
  } catch (error) {
    if (requestId !== assignmentRequestId) return;
    console.error("Could not load assignments:", error);

    for (const list of [pickupList, deliveryList]) {
      list.replaceChildren();

      list.appendChild(
        createElement(
          "p",
          "state-message state-error",
          error.message || "Unable to load assignments."
        )
      );
    }
  } finally {
    if (requestId !== assignmentRequestId) return;
    pickupList.setAttribute("aria-busy", "false");
    deliveryList.setAttribute("aria-busy", "false");
  }
}

document.getElementById("rider-access-form").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("rider-token");
  const newToken = input.value.trim();
  // An empty field refreshes with the credential already held in memory.
  // initialize() clears previous data and invalidates outstanding responses.
  if (newToken) setRiderToken(newToken);
  input.value = "";
  initialize();
});
document.getElementById("rider-sign-out").addEventListener("click", () => {
  setRiderToken("");
  document.getElementById("rider-token").value = "";
  initialize();
});
initialize();
