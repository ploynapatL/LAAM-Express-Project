# LAAM Express

Parcel delivery coursework project: PostgreSQL-backed US1 tracking, US2 rider assignments and US3 assigned customer contact.

Implementation is prepared for real PostgreSQL. This revision has only static/syntax verification; no server, SQL, automated tests, integration tests or Postman requests were run. PostgreSQL is not installed as part of this work.

- [Thai setup, assumptions and future test commands](docs/US1_US3_SETUP_TH.md)
- [US2-US3 API contract](docs/RIDER_API_CONTRACT.md)
- [US1 API contract](docs/API_CONTRACT.md)
- [Database schema](database/schema.sql)
- [Postman collection](postman/LAAM-US1-US3.postman_collection.json)

Use Node.js 20+ and PostgreSQL when ready to run. Follow the setup guide in order: install PostgreSQL, create a fresh dev database, apply schema/seed/access scripts, configure server/.env from .env.example, then run npm ci and npm start in server. Serve client over HTTP (for example python -m http.server 8080 in client).

The backend defaults to PostgreSQL, never silently to a mock. US2-US3 use temporary server-managed opaque access tokens mapped to employee IDs because the schema has no login/session tables. The API checks employee roles and task ownership in the database. This is an educational implementation; final authentication and business assumptions require team confirmation.

US1 uses seed tracking numbers LAAM001, LAAM002, LAAM003. LAAM002 is Picked Up in the current seed. The legacy mock files remain available but are not used by the US2-US3 frontend or standard startup. The old US1 unit tests explicitly inject fictional fixtures.

Later verification commands in server:

```powershell
npm test
# Only after configuring a dedicated real DB ending in _test and RUN_DB_TESTS=1:
npm run test:integration
```

Keep credentials in local .env files, never commit secrets. No commit or push was performed in this revision.
