
# LAAM Express — Database Documentation

## 1. Overview

LAAM Express is a parcel delivery management system using PostgreSQL.

The database supports parcel tracking, pickup scheduling, delivery management, payments, Cash on Delivery (COD), and customer information.

## 2. Database Technology

- DBMS: PostgreSQL
- Database: `laam_express_dev`
- SQL files: `database/`
- Database tables: 11

## 3. Database Tables

| Table | Purpose |
|---|---|
| customer | Stores customer information and customer types |
| coupon | Stores discount codes and conditions |
| branch | Stores branch and hub information |
| employee | Stores employee roles and branch assignments |
| orders | Stores shipping orders and service details |
| parcel | Stores parcel information and tracking numbers |
| parcel_status_history | Records parcel tracking history |
| pickup | Stores pickup appointments and inspection results |
| delivery | Stores delivery attempts and proof of delivery |
| payment | Stores payment transactions |
| cod | Stores Cash on Delivery transactions and settlement |

## 4. Main Relationships

- One customer can create many orders.
- Each order is associated with at most one parcel through a UNIQUE foreign key.
- One parcel can have multiple tracking history records.
- One pickup appointment can be linked to multiple orders.
- One parcel can have multiple delivery attempts.
- One order can have multiple payments.
- One order can have at most one COD record.
- One coupon can be used by multiple orders.
- Each employee can be assigned to a branch.

## 5. Business Rules

The database enforces several rules using primary keys, foreign keys, UNIQUE constraints, CHECK constraints, functions, and triggers.

Examples:

- Each parcel has a unique tracking number.
- Shipping fees and payment amounts cannot be negative.
- Chilled and Frozen parcels require Express service.
- Parcel statuses must follow the defined workflow.
- Status changes are recorded in parcel_status_history.
- Successful delivery requires proof of delivery.
- Pickup confirmation requires inspection validation.
- COD settlement information is validated.
- Failed deliveries trigger COD cancellation according to the implemented database logic.

Some rules require application or scheduled-job support, including shipping fee calculation, 7-day unclaimed parcel handling, 2-business-day COD settlement deadlines, and customer-specific authorization.

## 6. SQL Files

| File | Purpose |
|---|---|
| schema.sql | Creates the database structure for a fresh installation |
| seed.sql | Inserts sample data for development and demonstration |
| queries.sql | Contains demonstration SQL queries |
| access_control.sql | Defines PostgreSQL roles and database permissions |
| tests.sql | Tests selected database integrity rules |
| migrations/001_final_schema.sql | Upgrades the original development schema |

## 7. Fresh Database Setup

Run from the project root:

```bash
createdb -U YOUR_POSTGRES_USERNAME laam_express_new

psql -X -v ON_ERROR_STOP=1 -U YOUR_POSTGRES_USERNAME -d laam_express_new -f database/schema.sql

psql -X -v ON_ERROR_STOP=1 -U YOUR_POSTGRES_USERNAME -d laam_express_new -f database/seed.sql

psql -X -v ON_ERROR_STOP=1 -U YOUR_POSTGRES_USERNAME -d laam_express_new -f database/access_control.sql
```

Replace YOUR_POSTGRES_USERNAME with your PostgreSQL username.

Do not run the migration on a fresh database.

## 8. Run Demonstration Queries

```bash
psql -X -v ON_ERROR_STOP=1 -P pager=off -U YOUR_POSTGRES_USERNAME -d laam_express_new -f database/queries.sql
```

## 9. Run Database Tests

```bash
psql -X -v ON_ERROR_STOP=1 -P pager=off -U YOUR_POSTGRES_USERNAME -d laam_express_new -f database/tests.sql
```

The test suite contains 12 tests covering table existence, uniqueness, data integrity, parcel service rules, status workflow, delivery proof, COD settlement, foreign keys, and basic role permissions.

Test changes are rolled back at the end.

## 10. Migration

The migration file upgrades an existing development database without dropping its tables.

Before migration:

1. Back up the existing database.
2. Restore the backup into a separate test database.
3. Test the migration on that restored copy.
4. Compare data before and after migration.
5. Apply the migration to the intended development database only after successful verification.

Example backup:

```bash
pg_dump -U YOUR_POSTGRES_USERNAME -d laam_express_dev -F c -f database/backups/laam_express_dev_backup.dump
```

Example migration:

```bash
psql -X -v ON_ERROR_STOP=1 -U YOUR_POSTGRES_USERNAME -d laam_express_dev -f database/migrations/001_final_schema.sql
```

The migration must not be rerun after successful application.

## 11. Security

PostgreSQL roles are defined for tracking, pickup scheduling, and finance operations.

The access control script applies least-privilege permissions to selected tables and columns.

Customer-specific data access, employee authentication, and assignment-based authorization must also be enforced by the backend. The included roles do not independently implement per-customer row-level security.

## 12. Verification

During development:

- Fresh database tests: 12/12 passed.
- Migration on a restored development copy: committed successfully.
- Migration on laam_express_dev: committed successfully.
- Parcel count before and after migration: 3.
- Database triggers were verified after migration.

These results confirm the tested scenarios, not exhaustive production readiness.

## 13. Notes

- Do not commit database backups or environment files.
- Use parameterized queries in the backend.
- Keep database credentials in environment variables.
- Coordinate schema changes with the backend team.
