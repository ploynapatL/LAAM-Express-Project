const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
let items = [];
let nextId = 1;
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "cbe205-week9" }),
);
app.get("/api/items", (_req, res) => res.json(items));
app.post("/api/items", (req, res) => {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  if (!name) return res.status(400).json({ error: "name is required" });
  const item = { id: nextId++, name };
  items.push(item);
  res.status(201).json(item);
});
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API on http://localhost:${port}`));
