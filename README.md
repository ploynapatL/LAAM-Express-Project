# LAAM Express — Parcel & Document Delivery System

**CBE205 Software Engineering + CBE206 Database System Design and Management**  
**Demonstration branch:** [`feature/database-mock`](https://github.com/ploynapatL/LAAM-Express-Project/tree/feature/database-mock)  
**Environment:** Local development/demo — Express + PostgreSQL + static web frontend

LAAM Express is a university project for managing parcel and document delivery. The system connects shipping orders, parcels, tracking events, pickup appointments, rider assignments, customer contact information, and financial records in a relational PostgreSQL database.

**This branch brings together three implemented application user stories across Sprints 1 and 2, plus a Database Playground for demonstrating database requirements and business rules.** It is a coursework demonstration, **not** a fully deployed nationwide delivery platform.

## Contents

1. [What you can demonstrate](#1-what-you-can-demonstrate)
2. [Requirements and architecture](#2-requirements-and-architecture)
3. [Get the correct branch](#3-get-the-correct-branch)
4. [Set up PostgreSQL](#4-set-up-postgresql)
5. [Create the application database login](#5-create-the-application-database-login)
6. [Set up the separate Playground test login](#6-set-up-the-separate-playground-test-login)
7. [Configure server environment](#7-configure-server-environment)
8. [Start backend and frontend](#8-start-backend-and-frontend)
9. [Demo Sprint 1 — parcel tracking](#9-demo-sprint-1--parcel-tracking)
10. [Demo Sprint 2 — rider schedule and contact](#10-demo-sprint-2--rider-schedule-and-contact)
11. [Demo Database Playground](#11-demo-database-playground)
12. [Testing, limitations, and troubleshooting](#12-testing-limitations-and-troubleshooting)

## 1. What you can demonstrate

| Area | Feature | What the demo shows |
|---|---|---|
| **Sprint 1 — US1** | Parcel tracking | Look up a seeded tracking number, current shipment status, and tracking history from PostgreSQL. |
| **Sprint 2 — US2** | Rider assignment schedule | Authenticate with a configured demo rider token and list that rider's assigned pickup/delivery tasks. |
| **Sprint 2 — US3** | Assigned customer contact | Open an assigned task and retrieve the permitted sender/receiver phone number; other riders' tasks are not exposed. |
| **Database Playground** | FR/BR database demonstrations | Select one of **10 functional requirements**, run predefined tests against PostgreSQL, and inspect result evidence. **33 prepared test scenarios** are listed (TC-01–TC-32 and TC-02A). |

The Sprint UI and Playground use the **local Express backend** and **actual PostgreSQL connections**. The Playground is **not** a frontend-only fake database or a freeform SQL editor.

### Main links after local startup

| Page | Local URL |
|---|---|
| **Central Room (home)** | <http://localhost:8080/> |
| **Sprint 1: Parcel Tracking** | <http://localhost:8080/features/sprint1/sprint1.html> |
| **Sprint 2: Rider Schedule / Contact** | <http://localhost:8080/features/sprint2/US02/rider_schedule.html> |
| **Database Playground** | <http://localhost:8080/features/database_mock/database-mock.html> |
| **Backend health check** | <http://localhost:3001/api/health> |

These URLs assume that the frontend runs on port `8080` and the backend on port `3001`, as configured below.

## 2. Requirements and architecture

Install:

- **Git** (or download the correct branch as a ZIP)
- **Node.js 20+** and **npm**
- **PostgreSQL** running locally; **pgAdmin 4** is recommended for SQL setup
- A modern browser; VS Code is optional
- **Python 3** for the example static frontend server, or the VS Code **Live Server** extension instead

```text
Browser — client/index.html (Central Room)
  ├── Sprint 1 parcel tracking
  ├── Sprint 2 rider assignments and contact
  └── Database Playground
           │
           ▼
Express backend — localhost:3001
  ├── Tracking API (public tracking response)
  ├── Rider API (server-configured rider tokens + assignment checks)
  └── Playground API (local-only + separate token + fixed SQL tests)
           │
           ▼
PostgreSQL — laam_express_dev
  ├── laam_api: normal application reader
  └── laam_playground_test: separate local test-only login
```

The database schema has **11 tables**: `customer`, `coupon`, `branch`, `employee`, `orders`, `parcel`, `parcel_status_history`, `pickup`, `delivery`, `payment`, and `cod`.

Important source files:

| File or folder | Purpose |
|---|---|
| `client/` | Static frontend for Central Room, Sprint 1, Sprint 2, and Playground |
| `server/index.js`, `server/app.js` | Express server startup and API routing |
| `server/playground/` | Functional-requirement catalog, fixed scenarios, and Playground API |
| `database/schema.sql` | Create 11 tables, constraints, functions, and triggers |
| `database/seed.sql` | Insert sample demonstration data |
| `database/access_control.sql` | Base database access-control roles |
| `database/backend_read_access.sql` | Application backend reader privileges |
| `database/01_setup_playground_test_role.sql` | Dedicated Playground testing account and grants |
| `docs/US1_US3_SETUP_TH.md` | Additional Sprint 1–2 setup details (Thai) |
| `client/features/database_mock/HowToUsePlayground.md` | Extended Playground-specific instructions |

## 3. Get the correct branch

### Option A — Clone the demonstration branch

Open PowerShell or another terminal in the folder where you want the project:

```powershell
git clone --branch feature/database-mock --single-branch https://github.com/ploynapatL/LAAM-Express-Project.git
cd LAAM-Express-Project
```

Check which branch is selected:

```powershell
git branch --show-current
```

Expected: `feature/database-mock`.

**If you already cloned this repository**, first save/commit any changes before changing branches:

```powershell
git fetch origin
git switch feature/database-mock
```

If the branch does not exist locally, use `git switch --track origin/feature/database-mock` instead.

### Option B — Download ZIP

1. Open the [feature/database-mock branch](https://github.com/ploynapatL/LAAM-Express-Project/tree/feature/database-mock).
2. Confirm the branch selector says `feature/database-mock`.
3. Select **Code → Download ZIP**, extract it, and open the extracted folder.

Avoid overwriting files from another branch.

## 4. Set up PostgreSQL

> **Use a fresh, disposable local database.** The seed and Playground scenarios assume known demo records. Do not run this against a production or shared database.

### 4.1 Create a new database

Start PostgreSQL, open **pgAdmin 4**, and connect to your local PostgreSQL server using your administrator account (commonly `postgres`).

1. Expand **Servers → your PostgreSQL server → Databases**.
2. Right-click **Databases → Create → Database**.
3. Set **Database** to `laam_express_dev` and save.
4. Open the **Query Tool** connected to **`laam_express_dev`**. Verify the selected database before executing scripts.

Alternatively, from the **project root** with `createdb`/`psql` available on your PATH:

```powershell
createdb -U postgres laam_express_dev
```

### 4.2 Create tables and sample data

In pgAdmin Query Tool, execute each file **in this exact order**, one at a time:

1. `database/schema.sql` — creates database objects.
2. `database/seed.sql` — inserts demo records.
3. `database/access_control.sql` — configures base PostgreSQL roles and permissions.
4. `database/backend_read_access.sql` — prepares the backend reader role for Sprint 1–2.

Or run the equivalent commands **from the project root**:

```powershell
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_dev -f database/schema.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_dev -f database/seed.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_dev -f database/access_control.sql
psql -X -v ON_ERROR_STOP=1 -U postgres -d laam_express_dev -f database/backend_read_access.sql
```

In pgAdmin, check **`Databases → laam_express_dev → Schemas → public → Tables`**. There should be 11 project tables. The seed includes example tracking numbers `LAAM001`, `LAAM002`, and `LAAM003`.

**Important:** Do not rerun `schema.sql`/`seed.sql` on an existing populated project database. Do **not** run `database/migrations/001_final_schema.sql` on a fresh database; it is for upgrading an older development schema.

## 5. Create the application database login

The Sprint APIs use a dedicated PostgreSQL login, `laam_api`, which inherits the `laam_backend_reader` role created by `database/backend_read_access.sql`. This role reads the data needed by the application; rider task authorization is also checked in the backend.

Open **SQL Shell (psql)** or run `psql -U postgres -d laam_express_dev` in a terminal to connect as the database administrator. Then execute:

```sql
CREATE ROLE laam_api LOGIN;
\password laam_api
GRANT CONNECT ON DATABASE laam_express_dev TO laam_api;
GRANT laam_backend_reader TO laam_api;
```

When prompted by `\password`, choose a strong local password. If `laam_api` already exists, skip `CREATE ROLE` and update the password as needed. Exit psql with `\q`.

**pgAdmin alternative:** Use **Login/Group Roles → Create**, name it `laam_api`, enable login, set a password, and grant membership in `laam_backend_reader`. You can run the `GRANT CONNECT` and `GRANT laam_backend_reader` statements in Query Tool.

Save the application password for the next section. **Do not put PostgreSQL administrator credentials in the application's `.env` when a restricted login is available.**

## 6. Set up the separate Playground test login

The Playground executes predefined SQL demonstrations, including INSERT/UPDATE tests. It therefore requires a **separate local test account**; do not give those privileges to `laam_api`.

1. In pgAdmin, open the Query Tool for `laam_express_dev` **as `postgres` or the schema owner**.
2. Open `database/01_setup_playground_test_role.sql`.
3. Replace `REPLACE_WITH_NEW_TEST_PASSWORD` with your own strong password **in the editor**, without committing that edited version.
4. Execute the full script.
5. Verify that the final query returns `true` for all seven checks (`correct_database`, `can_read_parcel`, `can_update_parcel`, `can_read_orders`, `can_insert_payment`, `can_insert_history`, `can_call_status_function`).

The script creates/configures `laam_playground_test` and the required test permissions without changing the normal application login's grants. Keep its password for `PLAYGROUND_DB_PASSWORD`.

See [`database/READMETEST.md`](database/READMETEST.md) and the [full Playground guide](client/features/database_mock/HowToUsePlayground.md) for troubleshooting permission error `42501`.

## 7. Configure server environment

From the repository root:

```powershell
cd server
Copy-Item .env.example .env
npm ci
```

Open **`server/.env`**. Retain the application's existing settings and add the Playground-specific settings. An example structure is:

```dotenv
# Main backend + application database
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=laam_express_dev
DB_USER=laam_api
DB_PASSWORD=YOUR_APPLICATION_DB_PASSWORD

# Allowed local frontend origins
FRONTEND_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://localhost:5500,http://127.0.0.1:5500

# Temporary demo rider credentials (JSON: token -> employee ID)
RIDER_TOKENS_JSON={"YOUR_RANDOM_PICKUP_TOKEN":1,"YOUR_RANDOM_DELIVERY_TOKEN":2}

# Local Database Playground (separate from the main application login)
PLAYGROUND_ENABLED=true
PLAYGROUND_TOKEN=YOUR_RANDOM_PLAYGROUND_TOKEN
PLAYGROUND_DB_HOST=127.0.0.1
PLAYGROUND_DB_USER=laam_playground_test
PLAYGROUND_DB_PASSWORD=YOUR_PLAYGROUND_TEST_ROLE_PASSWORD
```

**Replace every `YOUR_...` placeholder.** Generate a separate token for each rider and for the Playground using:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Run that command **three times** and use the three distinct generated values. Use tokens of **at least 32 characters**, with no whitespace. On a **fresh seed database**, employee ID `1` is the Pickup Rider, ID `2` the Delivery Rider, and ID `3` a Hub Staff member (non-rider). If you changed seed data, confirm the IDs before creating the JSON mapping.

**Configuration details:**

- `DB_*` configures the main application database connection.
- The Playground uses `PLAYGROUND_DB_HOST`, `PLAYGROUND_DB_USER` and `PLAYGROUND_DB_PASSWORD`, but **shares `DB_NAME` and `DB_PORT`** in the current `server/playground/router.js`.
- Setting `PLAYGROUND_DB_NAME` or `PLAYGROUND_DB_PORT` **does not override** the database name/port in this branch.
- `PLAYGROUND_ENABLED=true` mounts the local test API; disable it outside testing.
- Do not share tokens/passwords, commit `.env`, or paste real credentials into documentation.

## 8. Start backend and frontend

Use **two terminals**; leave both running while demonstrating the app.

### Terminal 1 — Express backend

From `server/` (the directory used in Section 7):

```powershell
npm start
```

Expected output:

```text
PostgreSQL connected successfully!
Tracking API running at http://localhost:3001
```

Visit <http://localhost:3001/api/health>. You should receive JSON reporting an `ok` service status. If PostgreSQL is unavailable, this backend **fails to start**; it does not switch silently to a mock.

### Terminal 2 — Static frontend

Return to the project root in another terminal, then:

```powershell
cd client
python -m http.server 8080
```

On Windows, if `python` is not recognized but the Python launcher is installed, try `py -m http.server 8080`. Alternatively, open `client/index.html` using **VS Code Live Server** (typically port `5500`, already allowed by the example CORS config).

Open <http://localhost:8080/> in your browser. This page is the **Central Room** with links to Sprint 1, Sprint 2, and Database Playground. **Do not open the HTML with a `file://` URL**; serve it over local HTTP.

If changing backend port, update `client/features/sprint1/js/config.js`, `client/features/sprint2/US02/js/config.js`, and the Playground's **Backend API URL** field. If changing the frontend port, add its exact origin to `FRONTEND_ORIGINS`, then restart the backend.

## 9. Demo Sprint 1 — parcel tracking

1. From the **Central Room**, click **Sprint 1: Parcel Tracking** (or open the Sprint 1 URL from Section 1).
2. Enter one of the seeded tracking numbers: **`LAAM001`**, **`LAAM002`**, or **`LAAM003`**.
3. Submit the tracking lookup.
4. Observe the parcel's current status, service information, and history timeline retrieved through the backend from PostgreSQL.
5. Optionally, try an unknown or malformed tracking number to see the application's error handling.

**Expected data note:** The current seed identifies **`LAAM002` as `Picked Up`**, not `Delivered`. Do not describe all three sample parcels as delivered.

The browser uses the real API at `http://localhost:3001` (`USE_MOCK_API=false` in `client/features/sprint1/js/config.js`). The public tracking response does **not** include the sender's or receiver's phone number.

## 10. Demo Sprint 2 — rider schedule and contact

The Sprint 2 entry page combines **US2: assigned rider schedules** and **US3: permitted contact lookup**.

1. From the Central Room, click **Sprint 2: Rider Schedule & Assignment Details with Customer contact info**.
2. In the rider-token field, paste the **pickup rider token** configured for employee `1` in `RIDER_TOKENS_JSON`.
3. Load/refresh the assignments. With the fresh seed, pickup task IDs include **`P-1-O-1`**, **`P-1-O-2`**, and **`P-2-O-3`**.
4. Select a task's **View Details** action to inspect it. The contact lookup returns the appropriate **sender phone number** for an assigned pickup order. Use **Call customer** only if you actually intend to initiate a phone call.
5. Clear/change the token to the **delivery rider token** configured for employee `2`, then refresh. With the fresh seed, delivery attempts include **`D-1`** and **`D-2`**.
6. Open an assigned delivery task's details to retrieve the corresponding **receiver phone number**.
7. Compare the task lists: the backend checks the rider's role and assignment; it does **not** authorize a request just because a task ID is known.

**Important behavior and limitations:**

- Pickup task IDs have the form `P-<pickup_id>-O-<order_id>` because one appointment can contain multiple orders. Delivery attempt IDs have the form `D-<delivery_id>`.
- Pickup appointments have an appointment date/time. Delivery tasks currently have **no scheduled delivery appointment fields** in the schema; missing schedule details are displayed as unavailable rather than invented.
- The system uses **temporary server-configured demo tokens**, not a complete login/registration system. Keep them private.
- Missing or invalid token returns HTTP `401`; unsupported role/task type returns `403`; an unassigned or nonexistent task returns `404` in the contact lookup. See [`docs/RIDER_API_CONTRACT.md`](docs/RIDER_API_CONTRACT.md).
- This Sprint feature demonstrates *reading* assigned tasks and contact information. Do not assume it implements the entire real-world delivery lifecycle in the UI.

## 11. Demo Database Playground

The Playground links the **10 functional requirements (FR-01–FR-10)** to related business rules and reproducible SQL checks. Its backend runs **fixed** scenarios against the local PostgreSQL database and issues **ROLLBACK** at the end of each test transaction.

### 11.1 Connect

1. From the Central Room click **Database Mock** (the page itself is titled **Database Playground**), or open its direct URL from Section 1.
2. Confirm **Backend API URL** is `http://localhost:3001`.
3. Enter the exact secret from `PLAYGROUND_TOKEN` in `server/.env` into **Playground access token**. **Do not use a rider token here.**
4. Click **Connect & Load Requirements**.
5. Expect **`Connected: LOCAL_POSTGRESQL / ROLLBACK_ONLY`**, ten FR buttons, and a **General Database Tests** section.

### 11.2 Execute a test

1. Select an FR button, e.g. **FR-01: Track a parcel using its tracking number**.
2. Read the **Related Business Rules**, **Actor**, and **Use Case** shown by the UI.
3. Click **Run Primary Use Case Check** for the representative scenario, or **Run Prepared Test** next to an individual TC.
4. Review **Execution Result & Evidence** and the returned JSON, including the verdict, operation, source, transaction, expected result, and observed result.
5. Click **< Requirements** to return to the list. General Database Tests can also be run from their section.

Suggested opening sequence:

| Test | What to explain |
|---|---|
| `TC-01` | The expected 11 database tables exist. |
| `TC-13` | An actual tracking lookup query retrieves a parcel. |
| `TC-14` | Tracking history can be retrieved in order. |
| `TC-02A` | PostgreSQL rejects a duplicate tracking number (`SQLSTATE 23505`), which is a **successful negative test**. |
| `TC-08` | Status function and history-update behavior. |
| `TC-25` | COD settlement within two business days is **NOT_IMPLEMENTED**, not a passing enforcement test. |

### 11.3 Understand the output

| Label | Meaning |
|---|---|
| `PASS` | The scenario's assertions passed. A deliberately rejected invalid action may count as PASS. |
| `ERROR` | The scenario could not complete as expected; investigate configuration, fixtures, permissions, or SQL. |
| `NOT_IMPLEMENTED` | The selected rule is acknowledged but not enforced. |
| `DENIED` | A database operation was rejected (sometimes the expected result). |
| `SUCCEEDED` | The attempted operation succeeded. |
| `ACTUAL_POSTGRESQL` | The backend executed the test using PostgreSQL. |
| `ROLLED_BACK` | The test transaction was rolled back afterward. |

**Safety:** Rollback does not necessarily rewind PostgreSQL sequence numbers. Keep this feature on a **disposable local database**, not a production or public server. The Playground is **not** arbitrary SQL execution, nor does running its SQL tests prove all user-facing features or authentication paths are complete.

For a more detailed walkthrough and test limitations, see [HowToUsePlayground.md](client/features/database_mock/HowToUsePlayground.md).

## 12. Testing, limitations, and troubleshooting

### Additional verification (optional)

From `server/`:

```powershell
npm test
```

This runs the configured Sprint 1 unit-test script. To run PostgreSQL integration tests, use a **separate database whose name ends with `_test`** and opt in with `RUN_DB_TESTS=1`; follow [`docs/US1_US3_SETUP_TH.md`](docs/US1_US3_SETUP_TH.md) instead of aiming integration tests at `laam_express_dev`.

The repository also includes `database/tests.sql` for PostgreSQL integrity checks. Use it only after following the database setup/test instructions. The prepared Playground test inventory is **33 scenarios**, and the project report records **32 PASS + 1 NOT_IMPLEMENTED** in its isolated verification environment; results on your computer depend on setup and seed data.

### Known unfinished areas

- Automatic return of unclaimed parcels after seven days.
- Enforcing COD settlement **within two business days** (`TC-25`: `NOT_IMPLEMENTED`).
- Complete shipping fee and combined discount calculation workflows.
- Full customer/employee login and customer ownership enforcement.
- Broader financial reconciliation and some end-to-end application processes.

These limitations do **not** prevent demonstrating the three implemented sprint user stories and the specified database tests.

### Common problems

| Problem | Check / fix |
|---|---|
| Backend exits on startup | PostgreSQL must be running; verify `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and app-reader privileges. |
| `psql`/`createdb` is not recognized | Add PostgreSQL's `bin` folder to PATH or use pgAdmin Query Tool. |
| Frontend opens but no API response | Start `npm start` in `server/`, use a local HTTP server for `client/`, and verify backend port `3001`. |
| CORS error | Ensure the browser's frontend origin matches an entry in `FRONTEND_ORIGINS`; restart backend. |
| Sprint 2 shows unauthorized | Paste the correct **rider** token, not the Playground token; verify employee IDs and roles in the seed. |
| Playground FR list is empty | Supply `PLAYGROUND_TOKEN` and click **Connect & Load Requirements**. |
| Playground returns `401` | Check `PLAYGROUND_TOKEN` (minimum 32 chars) and restart backend after `.env` changes. |
| Playground test returns permission error `42501` | Recheck `laam_playground_test`, its password and grants in `01_setup_playground_test_role.sql`; **do not** grant broad test permissions to `laam_api`. |
| Test reports unexpected data | Recheck the correct database and the presence of the original seed records. |
| TC-25 says `NOT_IMPLEMENTED` | Expected: the two-business-day COD deadline is not enforced yet. |

### Security and documentation

This is an educational local demo. Never expose the Playground to the public internet, reuse real customer data, or commit database credentials and tokens. Browser users should never receive database login credentials.

Further reading:

- [Database README](database/README.md)
- [Playground detailed setup and usage](client/features/database_mock/HowToUsePlayground.md)
- [Sprint 1–2 / US1–US3 setup (Thai)](docs/US1_US3_SETUP_TH.md)
- [Sprint 1 tracking API](docs/API_CONTRACT.md)
- [Sprint 2 rider API](docs/RIDER_API_CONTRACT.md)
- [Project GitHub Wiki](https://github.com/ploynapatL/LAAM-Express-Project/wiki)

---

**Project:** LAAM Express · University coursework demonstration  
**Branch documented:** `feature/database-mock`  
**Scope of this README:** Reproducing and demonstrating the combined local Sprint 1, Sprint 2, and Database Playground experience.
