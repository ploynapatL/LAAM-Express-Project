# LAAM Express — How to Use the Database Playground

**Target branch:** `feature/database-mock`  
**Audience:** LAAM Express team members, reviewers, and instructors  
**Environment:** Local development only (Node.js, Express, PostgreSQL, browser)  
**Database name used in this guide:** `laam_express_dev`

> **Important:** The Database Playground runs *real, predefined PostgreSQL test scenarios*. It is not a browser-only simulation, and it must **never** be connected to a production or shared database. Its write tests run inside transactions that the backend rolls back; nevertheless, PostgreSQL sequence increments and certain external effects are not necessarily undone. Use a disposable local development database with demo data.

## 1. What the Playground Does

The Playground demonstrates the relationship between LAAM Express's **10 Functional Requirements (FR-01–FR-10)**, their related Business Rules, and actual database behavior.

- The **Central Room** links to **Database Playground**.
- The Playground displays **FR-01 through FR-10**, a short Use Case for each FR, prepared Test Cases, and a **Run Primary Use Case Check** button.
- The browser sends an authenticated request to the Express backend, which executes **fixed SQL** against PostgreSQL and returns an execution record with an expected result, observed evidence, and a verdict.
- The Playground also provides **General Database Tests** for structure and integrity checks.

**Test inventory:** TC-01 through TC-32 plus TC-02A (**33 scenarios**). Some scenarios check supporting database properties rather than complete end-to-end application authorization.

### Request flow

```text
Browser (Central Room → Database Playground)
  → Express API at http://localhost:3001/api/playground
  → Dedicated local PostgreSQL test connection
  → Fixed SQL / constraints / functions / triggers
  → Transaction ROLLBACK
  → JSON evidence returned to the Playground page
```

## 2. Requirements Before Starting

Install or prepare the following:

1. **Git** (for cloning and checking out the branch), or download the branch ZIP from GitHub.
2. **Node.js and npm** (required for the Express server).
3. **PostgreSQL** with the LAAM Express schema and sample data.
4. **pgAdmin 4** (recommended for the database setup steps).
5. **VS Code** with a local static server such as **Live Server**, or another way to serve the `client/` files over HTTP.
6. A separate **development database**, not a production or shared database.

The example environment uses PostgreSQL on `localhost:5432`, the backend on `localhost:3001`, and Live Server on port `5500`. Adjust the ports to match your machine, but keep the Playground on a local interface.

## 3. Step 1 — Obtain the Correct Source Code

### Option A — Clone the branch (recommended)

Open a terminal in the folder where you want to keep the project:

```powershell
git clone --branch feature/database-mock --single-branch https://github.com/ploynapatL/LAAM-Express-Project.git
cd LAAM-Express-Project
```

If you already have the repository, switch to the feature branch **after saving or committing any current changes**:

```powershell
git fetch origin
git switch feature/database-mock
```

If Git says that the branch is not available locally, use:

```powershell
git switch --track origin/feature/database-mock
```

### Option B — Download from GitHub

1. Open the [LAAM Express repository](https://github.com/ploynapatL/LAAM-Express-Project/tree/feature/database-mock).
2. Confirm that the branch selector displays **`feature/database-mock`**.
3. Select **Code → Download ZIP** and extract it into a separate folder.
4. Open the extracted project folder in VS Code.

**Do not** replace the contents of another working branch by copying this ZIP over it.

### Expected source layout

```text
LAAM-Express-Project/
├── client/
│   ├── index.html                          # Central Room
│   └── features/
│       └── database_mock/
│           ├── database-mock.html         # Playground page
│           └── js/playground.js           # Browser-side interactions
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   ├── access_control.sql
│   ├── backend_read_access.sql
│   ├── 01_setup_playground_test_role.sql  # Dedicated test account setup
│   └── README_TEST.md                     # Additional test-account guidance
└── server/
    ├── app.js
    ├── index.js
    ├── .env.example
    └── playground/
        ├── catalog.js
        ├── scenarios.js
        ├── router.js
        └── test/catalog.test.js
```

## 4. Step 2 — Prepare a Local PostgreSQL Database

**If your local `laam_express_dev` database already has all 11 tables and appropriate demo records, do not recreate it.** Move to Step 3.

For a fresh installation:

1. Open **pgAdmin 4** and connect to your local PostgreSQL server as a database administrator or schema owner.
2. Create a **new, disposable database** named **`laam_express_dev`** (if it does not already exist).
3. Right-click that database and open **Query Tool**.
4. Open and execute `database/schema.sql` against **`laam_express_dev`**.
5. Then open and execute `database/seed.sql` to insert sample records.
6. Then execute `database/access_control.sql` to create the documented database roles and privileges.
7. If the regular application will use `laam_api`, configure its login/permissions following the repository's database and backend documentation. The Playground account is configured separately in the next step.

**Do not run the migration file on a freshly created schema.** The migration exists to upgrade an older development schema and must only be used with an appropriate backup and verified migration procedure.

### Verify the tables

In pgAdmin, navigate to:

```text
Servers → PostgreSQL → Databases → laam_express_dev
        → Schemas → public → Tables
```

The 11 required tables are:

`branch`, `cod`, `coupon`, `customer`, `delivery`, `employee`, `orders`, `parcel`, `parcel_status_history`, `payment`, and `pickup`.

If the expected tables or sample records are missing, stop and complete the database setup **before** running the Playground scenarios. Never apply `schema.sql` again to a populated database without reviewing its effects.

## 5. Step 3 — Create the Dedicated Playground Test Role

The regular backend account **`laam_api` should not receive broad INSERT/UPDATE permissions just to make the Playground tests pass**. Use a separate login for the local testing environment.

1. In **pgAdmin**, open **Query Tool** for **`laam_express_dev`**, connected as `postgres` or the appropriate database owner.
2. Open `database/01_setup_playground_test_role.sql`.
3. Find `REPLACE_WITH_NEW_TEST_PASSWORD` and replace it with a **new strong password** for the Playground test account. Keep the surrounding SQL quotation marks. If the password includes a single quote, escape it according to PostgreSQL SQL-string rules; using a strong alphanumeric password avoids this issue.
4. Execute the **entire script**.
5. Inspect the last query's **Data Output**. All seven verification columns should return `true`:

| Verification column | Expected |
|---|---|
| `correct_database` | `true` |
| `can_read_parcel` | `true` |
| `can_update_parcel` | `true` |
| `can_read_orders` | `true` |
| `can_insert_payment` | `true` |
| `can_insert_history` | `true` |
| `can_call_status_function` | `true` |

**What this does:** Creates/updates the local-only `laam_playground_test` login and grants the specific table operations and status-function execution used by the prepared test suite. It does **not** change the underlying tables, stored rows, or the privileges of `laam_api`.

**Security:** Never commit the edited SQL file containing your actual password. The committed version must retain the placeholder. Do not share screenshots showing the password.

## 6. Step 4 — Configure `server/.env`

1. In VS Code, open the **`server`** folder.
2. Create a file named `.env` using `server/.env.example` as the starting template (copy and rename it if necessary).
3. Configure the normal application connection under `DB_*` as required by your local setup.
4. Add the Playground-specific values shown below. Replace the placeholders with your own credentials; do not copy the example placeholders literally.

```dotenv
# Main LAAM Express API connection
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=laam_express_dev
DB_USER=laam_api
DB_PASSWORD=REPLACE_WITH_YOUR_APPLICATION_DB_PASSWORD

# Preserve/configure the Sprint rider authentication data from .env.example
RIDER_TOKENS_JSON={"REPLACE_WITH_PICKUP_RIDER_TOKEN":1,"REPLACE_WITH_DELIVERY_RIDER_TOKEN":2}

# Local Database Playground
PLAYGROUND_ENABLED=true
PLAYGROUND_TOKEN=REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
PLAYGROUND_DB_HOST=127.0.0.1
PLAYGROUND_DB_USER=laam_playground_test
PLAYGROUND_DB_PASSWORD=REPLACE_WITH_THE_PASSWORD_FROM_STEP_3
```

### Generate a Playground access token

In a terminal, run:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the generated **64-character hex value** into `PLAYGROUND_TOKEN`. No quotation marks are required for this token in `.env`.

### Important configuration details

- **`DB_NAME=laam_express_dev` and `DB_PORT=5432` also control the Playground database name and port in the current `server/playground/router.js`.**
- The Playground connection uses `PLAYGROUND_DB_HOST`, `PLAYGROUND_DB_USER`, and `PLAYGROUND_DB_PASSWORD` for its own login.
- **`PLAYGROUND_DB_NAME` and `PLAYGROUND_DB_PORT` are not read by this version of `router.js`.** Adding them does not override `DB_NAME` or `DB_PORT`.
- Do not change the main API user `DB_USER=laam_api` to the Playground test user.
- Make sure `.env` is excluded from Git and is never committed.
- `PLAYGROUND_ENABLED=true` activates the test API. Disable it when not actively using the Playground.

## 7. Step 5 — Start the Backend

In VS Code, open a terminal in the project's **`server`** directory:

```powershell
cd server
npm install
npm start
```

If you opened your terminal in `server/` already, skip `cd server`.

Expected output includes messages similar to:

```text
PostgreSQL connected successfully!
Tracking API running at http://localhost:3001
```

**Keep this terminal running** while using the Playground. Startup success verifies the main API's database connection, but the Playground's separate database login is only verified when you execute a test.

If you modify `server/.env` or `server/playground/*.js`, restart the backend (`Ctrl+C`, then `npm start`).

## 8. Step 6 — Open the Frontend

1. Open `client/index.html` (the **Central Room**) in VS Code.
2. Use **Open with Live Server** (or your equivalent local static server).
3. In your browser, click **Database Playground**.
4. If needed, open `client/features/database_mock/database-mock.html` directly **through Live Server**, not as a `file://` page.
5. Confirm that the backend URL field contains **`http://localhost:3001`**.
6. Paste the secret value of `PLAYGROUND_TOKEN` into **Playground access token**.
7. Click **Connect & Load Requirements**.

When the connection succeeds, the page displays:

```text
Connected: LOCAL_POSTGRESQL / ROLLBACK_ONLY
```

You should see buttons for **FR-01 to FR-10** and the **General Database Tests** section.

> The list may initially be empty. This is normal **before** you enter the token and click Connect & Load Requirements.

## 9. Step 7 — Run Tests and Read Evidence

### Run an individual FR test

1. Click one of the **FR-01 ... FR-10** buttons.
2. Read its **Related Business Rules** and **Use Case** summary.
3. Under **Test Cases**, find the prepared scenario you want to demonstrate.
4. Click **Run Prepared Test**.
5. Read **Execution Result & Evidence** below the test list.
6. Use **< Requirements** to return to the FR list.

Alternatively, **Run Primary Use Case Check** runs one representative, database-backed scenario for that FR. It is **not** proof that the complete Use Case, including all authentication and UI behavior, has been implemented.

### Recommended first-run sequence

1. **TC-01** — Verify that the 11 required tables exist.
2. **TC-13 (FR-01)** — Retrieve a parcel by tracking number.
3. **TC-14 (FR-01)** — Retrieve its chronological status history.
4. **TC-02A (FR-01)** — Verify tracking-number uniqueness using the expected PostgreSQL `23505` rejection.
5. Continue with the remaining FR tests as needed.

### Meaning of each result

| Output | Meaning |
|---|---|
| `PASS` | The scenario's programmed assertions were satisfied. |
| `ERROR` | A scenario failed unexpectedly, e.g., missing permission, missing demo data, query mismatch, or wrong configuration. |
| `NOT_IMPLEMENTED` | The scenario deliberately reports a requirement that is not yet fully enforced. |
| `SUCCEEDED` | The tested action succeeded. |
| `DENIED` | PostgreSQL rejected an action that the test expected to be rejected. This **can be a PASS**. |
| `ACTUAL_POSTGRESQL` | The result came from a real PostgreSQL query, not a hardcoded browser response. |
| `ROLLED_BACK` | The backend issued transaction rollback after test execution. |
| `executionId`, `timestamp`, `durationMs` | Traceable execution metadata. |
| `evidence.observed` / `evidence.expected` | Actual database output and the scenario's expected condition. |

**Example of expected negative-test behavior:** A duplicate tracking-number test should produce a PostgreSQL UNIQUE constraint rejection (`SQLSTATE 23505`) and **PASS**, because rejecting the duplicate is the correct outcome.

## 10. What to Know Before Presenting

### Functional requirements and business-rule evidence

For a live demonstration, explain the chain:

**FR → Related BR → ER entity/relationship/cardinality → PostgreSQL table/column/constraint → Test Case → Actual result.**

The interface helps demonstrate the final step. Keep the ER diagram, FR/BR mapping, and GitHub Wiki documentation ready for the other steps. A useful two-minute flow is:

1. State the selected FR and its related BR.
2. Point to the relevant entity/relationship and database implementation.
3. Run one representative test.
4. Explain **what the observed database evidence proves** and any limitation.

### Known limitations — do not present these as fully implemented

- **TC-02:** Historical duplicate-tracking/order test is *limited*: duplicate `order_id` can cause rejection before the tracking-number constraint. Use **TC-02A** for direct tracking-number uniqueness evidence.
- **TC-17 and TC-18:** Demonstrate assignment-scoped SQL only. They do **not** independently prove authenticated HTTP authorization.
- **TC-19 and TC-30:** Check database privileges, not complete impersonated application authorization.
- **TC-25 / BR-12:** The two-business-day COD settlement deadline is **`NOT_IMPLEMENTED`**; recording COD dates is not equivalent to enforcing the deadline.
- **TC-27:** Shows an order has a single coupon foreign-key column; it is not a complete second-coupon request-flow test.
- **TC-28:** Shows coupon and membership discount fields can coexist; it does not prove the final discount calculation.
- **Use Cases:** Are documented workflows; the primary-use-case buttons perform representative database checks, not necessarily the entire UI/backend authentication flow.

Some tests depend on seeded sample records having particular statuses, service types, coupons, or COD conditions. An `ERROR` caused by missing fixtures should not be reported as a failure of the underlying business rule without further investigation.

## 11. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| FR list does not appear | Not connected yet | Enter the token, confirm URL, click **Connect & Load Requirements**. |
| `401` / token required | Wrong/missing Playground token | Compare the browser token with `PLAYGROUND_TOKEN` in `server/.env`; do not share it. |
| `Failed to fetch` | Backend stopped, wrong URL, or blocked origin | Keep `npm start` running and use `http://localhost:3001` with a local Live Server URL. |
| `password authentication failed` (`28P01`) | Wrong Playground test-account credentials | Verify `PLAYGROUND_DB_USER` and `PLAYGROUND_DB_PASSWORD`; restart backend. |
| `permission denied` (`42501`) | Incorrect database login or missing test-role grants | Confirm that the Playground uses `laam_playground_test` and the role setup checks returned true. Do **not** grant all permissions to `laam_api`. |
| `Expected 11 tables; found 6` | The count uses a privilege-filtered view or the wrong database/schema | Confirm the current `scenarios.js` TC-01 uses `pg_catalog.pg_tables`, and verify `DB_NAME=laam_express_dev`. |
| A query returns zero rows | Required demo records are missing | Check `database/seed.sql` and the actual local fixtures; avoid altering production data. |
| `NOT_IMPLEMENTED` on TC-25 | Intended documentation of missing COD deadline enforcement | Keep the result and explain the limitation; do not replace it with a hardcoded PASS. |
| Changes to `.env` do not take effect | Backend was not restarted | Stop and restart `npm start`. |
| App's Sprint APIs stop working | Main `DB_*` credentials were changed | Restore the original application's DB settings; Playground uses separate `PLAYGROUND_DB_USER`/`PASSWORD`. |

### Notes on the current TC-13 and TC-14 implementation

The working Playground branch has been adjusted to respect the restricted reader's column access:

- The shared `sample()` query does not require `orders.coupon_id`.
- TC-14 can return `parcel_status_history.employee_id` without joining to the protected `employee.name` column.

If a newly downloaded branch or another checkout behaves differently, compare its `server/playground/scenarios.js` with the tested version before granting new permissions.

## 12. Security and Git Hygiene

- **Never commit `server/.env`, access tokens, database passwords, or a copy of the test-role SQL containing a real password.**
- Keep the committed `database/01_setup_playground_test_role.sql` password as the **placeholder**, not your actual value.
- Never grant this test role to customers, riders, or browser users, and do not reuse it for the main Sprint backend.
- Do not expose the Playground API on a public network. Its backend enforces a localhost request check and Bearer token, but these do not make it safe for public deployment.
- The frontend sends only the Playground token to the backend; PostgreSQL credentials remain in `server/.env` on the server.
- Do not commit local backups such as `.playground-backups/` or `database-mock-before-rollback.html`.
- Before screenshots or screen sharing, close or hide `.env` and any SQL editor showing a real password.
- Before leaving the local testing environment, set `PLAYGROUND_ENABLED=false` and restart the backend when the Playground is not needed.

## 13. Quick Restart Checklist (After Initial Setup)

Once the local database, roles, and `.env` are configured, you **do not need to repeat the setup SQL each time**.

1. Start the local PostgreSQL service.
2. Open the source checkout of `feature/database-mock`.
3. In `server/`, run `npm start` (install dependencies with `npm install` first if necessary).
4. Open the Central Room using Live Server.
5. Click **Database Playground**.
6. Enter `PLAYGROUND_TOKEN` and click **Connect & Load Requirements**.
7. Select an FR and run the required prepared test.
8. Explain the returned evidence and record any known limitation.

---

### Related project files

- `database/README.md` — database design, tables, schema setup, migration guidance
- `database/README_TEST.md` — dedicated Playground test-role notes
- `database/01_setup_playground_test_role.sql` — local testing role and verification checks
- `database/queries.sql` — example SQL joins and data retrieval
- `database/tests.sql` — the database's separate integrity test script
- `server/playground/catalog.js` — FR and Use Case catalog
- `server/playground/scenarios.js` — predefined PostgreSQL test logic
- `server/playground/router.js` — token-protected local Playground API
- `client/features/database_mock/database-mock.html` — Playground UI

**Document scope:** Instructions for a local checkout of `feature/database-mock`. This guide does not claim that every FR is production-ready or that all Business Rules are enforced end to end.
