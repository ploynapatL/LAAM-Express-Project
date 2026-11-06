# LAAM Express

**Parcel and Document Delivery Management System**  
CBE205 — Software Engineering | Team Project

## Overview

LAAM Express is a web-based project for managing parcel and document delivery workflows. The planned system covers parcel registration, pickup, sorting, transportation, tracking, delivery, and related operations.

The **current Sprint 1 implementation** focuses on **public parcel tracking**: users can search by tracking number and view the latest parcel status and available tracking history without signing in. The repository also contains a starter demonstration page and supporting project documentation. Features described in the broader project scope are not necessarily implemented yet.

## Current demo features

- Search for a parcel by tracking number (no login required).
- View the current status, latest recorded location and timestamp, and tracking history when available.
- Display suitable messages for invalid or unknown tracking numbers.
- Retrieve data through a read-only Express API backed by PostgreSQL in the standard server startup configuration.
- Use a separate mock-data mode for frontend demonstration without PostgreSQL.

> **Scope note:** Order creation, rider operations, payments, authentication, and administrative functionality are part of the broader project plan, not features guaranteed by this Sprint 1 demo.

## Project structure

```text
LAAM-Express-Project/
├── client/
│   ├── index.html                         # Project home / feature navigation
│   ├── assets/                            # Home page CSS and JavaScript
│   └── features/
│       └── sprint1/
│           ├── sprint1.html              # Parcel tracking screen
│           ├── css/styles.css
│           └── js/
│               ├── config.js             # Frontend API and mock-mode settings
│               ├── main.js
│               ├── tracking-api.js
│               └── mock-tracking.js
├── server/
│   ├── index.js                           # Backend entry point
│   ├── app.js                             # Express routes and middleware
│   ├── config/db.js                       # PostgreSQL connection pool
│   ├── repositories/                      # PostgreSQL and demo repositories
│   ├── data/demo-parcels.json             # Fictional tracking data for tests
│   ├── test/tracking.test.js              # Backend automated tests
│   └── package.json
├── database/
│   ├── schema.sql                         # Database tables
│   ├── seed.sql                           # Sample records
│   ├── queries.sql                        # Example tracking queries
│   └── README.md                          # Database-specific setup
├── docs/                                  # Requirements and technical documentation
├── .gitignore
└── README.md
```

## Requirements

Install the following before running the database-backed demo:

| Software | Requirement | Purpose |
|---|---|---|
| Node.js | **20 or newer** | Run the backend and automated tests |
| npm | Bundled with Node.js | Install backend dependencies |
| PostgreSQL | Installed and running; version not pinned in this repository | Store tracking records |
| PostgreSQL command-line tools (`psql`, optionally `createdb`) | Available in your terminal, or use pgAdmin | Initialize the database |
| Modern browser | Chrome, Edge, Firefox, etc. | Open the frontend |
| Python 3 **or** VS Code Live Server | Optional alternative frontends | Serve static files over HTTP |
| Git | Recommended | Clone the repository |

Check available tools in PowerShell:

```powershell
node --version
npm --version
psql --version
python --version
```

If `psql` is not recognized, use **SQL Shell (psql)** or **pgAdmin Query Tool**, or add PostgreSQL's `bin` directory to your system PATH. Python is only needed if you choose the Python frontend-server option.

## 1. Get the project

Clone the repository:

```powershell
git clone https://github.com/ploynapatL/LAAM-Express-Project.git
cd LAAM-Express-Project
```

Alternatively, download the repository as a ZIP, extract it, and open a terminal in the extracted project root (the folder containing `client`, `server`, and `database`).

> **Working directory:** Database commands below run from the **project root**. Backend commands run from **`server/`**. Frontend commands run from **`client/`**.

## 2. Prepare PostgreSQL

Start your local PostgreSQL server. Create a database named `laam_express`. For example, from the project root, if the PostgreSQL command-line tools and your database account are configured:

```powershell
createdb -U postgres laam_express
```

You may instead create `laam_express` using **pgAdmin**. Skip creation if the database already exists. If your PostgreSQL administrator account is not named `postgres`, substitute the correct account.

From the **project root**, apply the schema and sample data:

```powershell
psql -U postgres -d laam_express -v ON_ERROR_STOP=1 -f database/schema.sql
psql -U postgres -d laam_express -v ON_ERROR_STOP=1 -f database/seed.sql
```

Optional: run the prepared example queries:

```powershell
psql -U postgres -d laam_express -v ON_ERROR_STOP=1 -f database/queries.sql
```

These commands may prompt for your PostgreSQL password. The SQL files can also be opened and executed in **pgAdmin Query Tool**, in this order: `schema.sql`, then `seed.sql`, then optionally `queries.sql`.

### PostgreSQL sample tracking numbers

| Tracking number | Initial seeded status |
|---|---|
| `LAAM001` | In Transit |
| `LAAM002` | Delivered |
| `LAAM003` | Order Created |

Use these numbers for the **PostgreSQL-backed** demo. The seed script also creates status history events.

## 3. Configure the backend

The backend reads its database settings from environment variables. Create a **local** file named `server/.env` and fill in values for your own PostgreSQL installation:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_LOCAL_DATABASE_PASSWORD
DB_NAME=laam_express
PORT=3001
```

Replace `YOUR_LOCAL_DATABASE_PASSWORD` with your local PostgreSQL password. Change `DB_USER`, `DB_PORT`, or `DB_HOST` if your installation uses different values.

**Security:** Keep `server/.env` local. Never commit passwords, credentials, `.env` files, or other secrets to GitHub. This repository's `.gitignore` excludes `.env` files.

By default, the application accepts browser requests from common local frontend origins including `http://localhost:8080` and `http://localhost:5500`. If you serve the frontend at another origin, configure `FRONTEND_ORIGINS` as a comma-separated list of allowed origins. For example:

```dotenv
FRONTEND_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
```

## 4. Start the backend — Terminal 1

Open a PowerShell terminal in the **project root** and run:

```powershell
cd server
npm install
npm start
```

The backend must be able to connect to PostgreSQL before it starts listening. On success, it should report a successful PostgreSQL connection and an API address such as:

```text
http://localhost:3001
```

Leave this terminal open while using the database-backed demo.

Check the health endpoint in a browser:

```text
http://localhost:3001/api/health
```

A working PostgreSQL-backed server should return JSON containing `"status":"ok"` and `"dataSource":"postgresql"`.

## 5. Start the frontend — Terminal 2

Open a **second** terminal in the project root. If Python 3 is installed:

```powershell
cd client
python -m http.server 8080
```

If your system uses `py` rather than `python`, run `py -3 -m http.server 8080` instead.

Open the home page:

**http://localhost:8080/**

Then select **Sprint 1: Parcel Tracking**, or go directly to:

**http://localhost:8080/features/sprint1/sprint1.html**

You can also serve the `client/` directory with the **VS Code Live Server** extension. If Live Server chooses a port other than those allowed in the backend CORS configuration, update `FRONTEND_ORIGINS` and restart the backend.

> Do not open `sprint1.html` using a `file://` URL. Serve the frontend over HTTP because its JavaScript uses modules and makes requests to the API.

## 6. Try the parcel-tracking demo

1. Verify the backend health endpoint works.
2. Open the Sprint 1 tracking page.
3. Enter a PostgreSQL seed tracking number: `LAAM001`, `LAAM002`, or `LAAM003`.
4. Click **Track parcel** to inspect the current status and tracking history.
5. Try `UNKNOWN123` to see how a nonexistent tracking number is handled.
6. Try `AB` to see client-side validation for an invalid tracking number.

### Important demo-data distinction

The frontend configuration in this repository snapshot contains these **older mock/demo identifiers**:

- `LAAM20260001`
- `LAAM20260002`
- `LAAM20260003`

However, the PostgreSQL seed file inserts **`LAAM001`, `LAAM002`, and `LAAM003`**. Consequently, the frontend's initial sample-parcel cards may be empty when connected to the seeded PostgreSQL database. **Manually entering one of the PostgreSQL seed numbers into the search box is the intended database-backed demonstration for this snapshot.** The mock numbers work with mock mode instead. This data mismatch should be aligned in a future update.

## 7. API checks

The backend provides:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend health and data source |
| `GET` | `/api/tracking/:trackingNo` | Public, read-only parcel lookup |
| `GET` / `POST` | `/api/items` | Legacy starter demonstration routes; not part of the main tracking feature |

Use a browser to open:

```text
http://localhost:3001/api/tracking/LAAM001
```

Or use PowerShell:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:3001/api/tracking/LAAM001
```

Tracking API behavior includes:

- `200 OK` for a found parcel.
- `400 Bad Request` for an invalid tracking number format.
- `404 Not Found` for a valid-format tracking number that does not exist.
- `429 Too Many Requests` when the tracking rate limit is exceeded.
- `500 Internal Server Error` for unexpected backend failures.

The public tracking response includes only selected parcel fields and status-history information; it is not an administrative or parcel-status editing API.

## 8. Run automated tests

Open a terminal in the project root and run:

```powershell
cd server
npm install
npm test
```

The tests use Node.js's built-in test runner and a **demo repository injected into the Express application**. They cover API behavior such as successful tracking responses, validation, missing parcels, ordering of history, rate limiting, CORS, and error handling.

**Note:** Passing `npm test` does **not** prove that PostgreSQL is connected correctly. Verify the PostgreSQL integration separately by running `npm start` and requesting one of the seeded tracking numbers (`LAAM001`–`LAAM003`).

## 9. Optional: run the frontend in mock mode

You can explore the tracking interface without installing or starting PostgreSQL.

1. Open `client/features/sprint1/js/config.js`.
2. Change `USE_MOCK_API` from `false` to `true` **in your local copy**.
3. Serve the `client/` folder as explained in Step 5.
4. Open the Sprint 1 tracking page and use `LAAM20260001`, `LAAM20260002`, or `LAAM20260003`.

This mode uses static fictional data from `client/features/sprint1/js/mock-tracking.js` and does not contact the backend. Return `USE_MOCK_API` to `false` to use the real API again.

## 10. Common troubleshooting

| Problem | What to check |
|---|---|
| `psql` or `createdb` is not recognized | Use SQL Shell/pgAdmin or add PostgreSQL command-line tools to PATH. |
| Backend exits with a database error | Start PostgreSQL; confirm `server/.env`, credentials, database name, and schema. |
| Tracking page cannot reach the API | Confirm backend is running on port 3001 and `USE_MOCK_API=false`. |
| Browser reports a CORS error | Serve from an allowed origin, or set `FRONTEND_ORIGINS` and restart the backend. |
| Seed numbers return 404 | Check whether `database/seed.sql` was executed in the same database configured in `server/.env`. |
| Sample cards are missing in PostgreSQL mode | The frontend's older sample IDs do not match the PostgreSQL seed IDs; search manually for `LAAM001`–`LAAM003`. |
| Frontend does not work when opened directly | Serve `client/` via Python HTTP server or VS Code Live Server; do not use `file://`. |
| Port 3001 or 8080 is already in use | Stop the conflicting service or configure matching ports and API/CORS settings. |

## Documentation

- [`database/README.md`](database/README.md) — PostgreSQL setup and seed data.
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) — Tracking API contract and public response expectations.
- [`docs/BACKEND_SETUP_TH.md`](docs/BACKEND_SETUP_TH.md) — Thai-language backend notes (written for an earlier demo-data stage; some details are outdated after PostgreSQL integration).
- [`docs/BACKLOG_AND_SPRINT0.md`](docs/BACKLOG_AND_SPRINT0.md) — Earlier backlog/Sprint 0 documentation template.
- [`docs/SRS_V1_TEMPLATE.md`](docs/SRS_V1_TEMPLATE.md) — SRS template.
- [`docs/PEER_REVIEW.md`](docs/PEER_REVIEW.md) — Peer-review documentation.

## Development and security notes

- This is an educational, evolving software project, **not a production-ready delivery service**.
- Do not use real customer data or real credentials in the demonstration.
- The current public tracking endpoint is read-only and does not require a customer login.
- Database credentials must be stored locally and must not be committed.
- Keep documentation, tests, and implementation aligned when features change.

---

**LAAM Express — CBE205 Software Engineering team project**
