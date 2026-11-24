
const { Pool } = require("pg");

// Select database connection configuration
const dbConfig = process.env.DATABASE_URL
  ? {
      // Cloud environment (Render)
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: true
      }
    }
  : {
      // Local development environment
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    };

// Create PostgreSQL connection pool
const pool = new Pool({
  ...dbConfig,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

module.exports = pool;
