const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env"),
});

const pool = require("./db");
const { createApp } = require("./app");
const {
    createPostgresRepository,
} = require("./repositories/postgres-tracking-repository");

const allowedOrigins = process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : undefined;

const repository = createPostgresRepository(pool);

const app = createApp({
    repository,
    allowedOrigins,
});

const port = process.env.PORT || 3001;

async function start() {
    try {
        await pool.query("SELECT 1");

        app.listen(port, () => {
            console.log(`Tracking API on http://localhost:${port}`);
            console.log("Connected to PostgreSQL");
        });
    } catch (error) {
        console.error("Database error:", error.code, error.message);
        await pool.end();
        process.exitCode = 1;
    }
}

start();