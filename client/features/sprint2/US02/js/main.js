
/*
 * LAAM Express — Sprint 2 / US-02
 * Rider Schedule Frontend Controller
 */

// import { getMockAssignments } from "./mock_data.js";
import { getAssignments } from "./schedule_api.js";

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

  renderTaskDetails(task);
  changeView("detail");
}

function backToAssignments() {
  changeView(previousAssignmentView);
}

// ==========================================
// 4. HELPERS
// ==========================================

function formatDate(dateString) {
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

function statusClass(status) {
  const classes = {
    "Scheduled": "status-scheduled",
    "In Progress": "status-in-progress",
    "Completed": "status-completed",
    "Cancelled": "status-cancelled"
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
    `🕒 ${task.startTime} – ${task.endTime}`
  );

  const addressLine = createElement(
    "p",
    "",
    `📍 ${task.address}`
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
      const first = `${a.date}T${a.startTime}`;
      const second = `${b.date}T${b.startTime}`;
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
    `${task.startTime} – ${task.endTime}`;

  document.getElementById(
    "detail-location-title"
  ).textContent =
    task.type === "pickup"
      ? "Pickup Location"
      : "Delivery Location";

  document.getElementById(
    "detail-location"
  ).textContent = task.address;

  document.getElementById(
    "detail-note"
  ).textContent =
    task.note || "No note provided.";

  // US-03 will later use task.taskId to
  // retrieve authorized customer contact data.
}

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

async function initialize() {
  changeView("pickup");

  pickupList.setAttribute("aria-busy", "true");
  deliveryList.setAttribute("aria-busy", "true");

  try {
    assignments = await getAssignments();

    renderAssignments("pickup", pickupList);
    renderAssignments("delivery", deliveryList);
  } catch (error) {
    console.error("Could not load assignments:", error);

    for (const list of [pickupList, deliveryList]) {
      list.replaceChildren();

      list.appendChild(
        createElement(
          "p",
          "state-message state-error",
          "Unable to load assignments."
        )
      );
    }
  } finally {
    pickupList.setAttribute("aria-busy", "false");
    deliveryList.setAttribute("aria-busy", "false");
  }
}

initialize();
