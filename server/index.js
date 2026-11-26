
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
  const { rows: [tables] } = await pool.query(
    `SELECT to_regclass('web_account') AS account, to_regclass('web_session') AS session,
            to_regclass('rider_route_stop') AS route_stop`
  );
  if (!tables.account || !tables.session) {
    throw new Error('Run database/migrations/002_accounts.sql before starting LAAM Express.');
  }
  if (!tables.route_stop) {
    throw new Error('Run database/migrations/003_rider_route_stops.sql before starting LAAM Express.');
  }

  console.log("PostgreSQL connected successfully!");

  // Inject PostgreSQL repository into Express
  const app = createApp({
    repository: createPostgresRepository(),
    riderTokens,
    allowedOrigins
  });

  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || (process.env.RENDER || process.env.NODE_ENV === 'production'
    ? "0.0.0.0"
    : "127.0.0.1");

  app.listen(port, host, () => {
    console.log(`LAAM Express is available at http://localhost:${port}`);
  });
}

startServer().catch(error => {
  console.error("Server startup failed:", error.message);
  process.exitCode = 1;
  pool.end().catch(() => {});
});
