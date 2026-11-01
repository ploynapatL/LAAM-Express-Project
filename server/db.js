const { Pool } = require("pg");

const pool = new Pool({
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
});

pool.on("error", () => {
    console.error("Unexpected database connection error");
});

module.exports = pool;