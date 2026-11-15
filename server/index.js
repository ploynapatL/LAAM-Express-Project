
require("dotenv").config();

const { createApp } = require("./app");
const { createPostgresRepository } =
  require("./repositories/postgres-repositories");
const pool = require("./config/db");
const { parseRiderTokens } = require('./routes/riders');

const allowedOrigins = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  : undefined;

async function startServer() {
  const riderTokens = parseRiderTokens(process.env.RIDER_TOKENS_JSON);
  // Verify PostgreSQL is accessible before starting Express
  await pool.query("SELECT 1");

  console.log("PostgreSQL connected successfully!");

  // Inject PostgreSQL repository into Express
  const app = createApp({
    repository: createPostgresRepository(),
    riderTokens,
    allowedOrigins
  });

  const port = process.env.PORT || 3001;

  app.listen(port, () => {
    console.log(`Tracking API running at http://localhost:${port}`);
  });
}

startServer().catch(error => {
  console.error("Server startup failed:", error.message);
  process.exitCode = 1;
  pool.end().catch(() => {});
});
