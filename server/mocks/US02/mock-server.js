
/*
 * LAAM EXPRESS — Sprint 2 / US-02
 * Temporary Express Mock API
 *
 * Run from the existing server folder:
 * node mocks/US02/mock-server.js
 *
 * This server does not access PostgreSQL.
 * FOR LOCAL DEVELOPMENT ONLY.
 */

const express = require("express");
const cors = require("cors");

const {
  demoRiders,
  demoAssignments
} = require("./mock-data");

const app = express();
const PORT = 3002;

// ==========================================
// 1. BASIC CONFIGURATION
// ==========================================

app.disable("x-powered-by");

app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501"
  ]
}));

app.use(express.json());

app.use("/api/riders", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ==========================================
// 2. DEMO RIDER AUTHENTICATION
// ==========================================

function authenticateDemoRider(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  const token = authorization.substring(7);

  const rider = demoRiders.find(
    item => item.token === token
  );

  if (!rider) {
    return res.status(401).json({
      error: "Invalid demo rider token"
    });
  }

  req.rider = rider;
  next();
}

// ==========================================
// 3. HEALTH CHECK
// ==========================================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "laam-us02-mock",
    dataSource: "fictional-data"
  });
});

// ==========================================
// 4. ASSIGNED PICKUPS
// ==========================================

app.get(
  "/api/riders/me/pickups",
  authenticateDemoRider,
  (req, res) => {

    const pickups = demoAssignments.filter(
      task =>
        task.riderId === req.rider.riderId &&
        task.type === "pickup"
    );

    res.json({
      riderId: req.rider.riderId,
      assignments: pickups
    });
  }
);

// ==========================================
// 5. ASSIGNED DELIVERIES
// ==========================================

app.get(
  "/api/riders/me/deliveries",
  authenticateDemoRider,
  (req, res) => {

    const deliveries = demoAssignments.filter(
      task =>
        task.riderId === req.rider.riderId &&
        task.type === "delivery"
    );

    res.json({
      riderId: req.rider.riderId,
      assignments: deliveries
    });
  }
);

// ==========================================
// 6. NOT FOUND
// ==========================================

app.use((_req, res) => {
  res.status(404).json({
    error: "Endpoint not found"
  });
});

// ==========================================
// 7. START MOCK SERVER
// ==========================================

if (require.main === module) {
  app.listen(PORT, "127.0.0.1", () => {
    console.log(
      `US-02 Mock API running at http://127.0.0.1:${PORT}`
    );
  });
}

module.exports = { app };
