# LAAM Express — Playground Test Role Fix

This fixes permission error `42501` in data-changing Playground tests **without granting new privileges to `laam_api`** or altering schema/data.

## Only three actions

1. In pgAdmin, open Query Tool for **laam_express_dev**, connected as PostgreSQL schema owner (`postgres`). Open `01_setup_playground_test_role.sql`, replace `REPLACE_WITH_NEW_TEST_PASSWORD` with a **new strong password**, and click Execute. Do not publish or commit the edited SQL file. Check that the final SQL result values are all `true`.
2. In VS Code `server/.env`, keep existing `DB_*` (Sprint API) unchanged, and set these Playground-only settings:
   ```dotenv
   PLAYGROUND_DB_HOST=127.0.0.1
   PLAYGROUND_DB_USER=laam_playground_test
   PLAYGROUND_DB_PASSWORD=YOUR_NEW_TEST_PASSWORD
   PLAYGROUND_ENABLED=true
   ```
   Keep `PLAYGROUND_TOKEN` unchanged. Existing Playground router uses `DB_PORT` and `DB_NAME` from the main config, so leave these set to `5432` and `laam_express_dev` respectively. `PLAYGROUND_DB_PORT` and `PLAYGROUND_DB_NAME` aren't read by the currently installed router.
3. Save `.env`; restart the backend (`Ctrl+C`, then `npm start` in `server`). In browser run **TC-02A first**, then TC-02. TC-02 is intentionally labelled limited because duplicate order ID can cause rejection before tracking uniqueness.

## What this changes

- One new login role: `laam_playground_test`.
- Privileges on existing tables and status function for the fixed test cases.
- **No table/schema alteration; no changes to `laam_api`, rider roles, or project files.**
- Database writes in the Playground still use transactions with `ROLLBACK` (verify backend router is the current one). Sequence advances are not guaranteed to roll back, so tests must be run only against disposable development data.

## Limitations and safety

- This role has broad *test-only* read/write privileges across the project schema because the 33 scenarios exercise many tables. It is **not** a production role and must not be used by the main application.
- Do not use Playground with a public server or production database. Protect your Playground token, test-account password, and `.env`.
- Rejected operations should show the expected SQLSTATE (e.g. `23505` for tracking uniqueness). If a different error occurs, do not weaken database constraints; inspect the reported error.
- Some tests may still fail because their test data assumptions are unmet or SQL logic does not match your actual schema. A permission fix cannot guarantee all 33 tests PASS.
- This role does not itself perform HTTP identity simulation; SQL role checks are separate from real application authorization.
