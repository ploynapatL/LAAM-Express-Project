# LAAM Express — Database

## Overview

This folder contains the PostgreSQL database implementation for the LAAM Express parcel delivery management system.

**Version:** 1.0  
**Database:** PostgreSQL  
**Status:** Initial implementation — SQL tests completed; web integration pending verification.

The database supports customer management, parcel tracking, pickup scheduling, delivery, payments, Cash on Delivery (COD), and promotional coupons.

## 1. Database Structure

The database consists of 11 relational tables.

| Table | Description |
|---|---|
| `customer` | Stores customer information. |
| `orders` | Stores shipping orders and sender/receiver details. |
| `parcel` | Stores parcel details and tracking numbers. |
| `parcel_status_history` | Records parcel status updates. |
| `pickup` | Stores pickup appointments and assigned riders. |
| `delivery` | Stores delivery information and proof of delivery. |
| `employee` | Stores employee information and roles. |
| `branch` | Stores branch information. |
| `payment` | Records order payments. |
| `cod` | Stores Cash on Delivery transactions. |
| `coupon` | Stores promotional coupons and discounts. |

Primary Keys (PK), Foreign Keys (FK), and selected constraints are implemented to maintain data integrity.

## 2. Database Files

| File | Purpose |
|---|---|
| `schema.sql` | Creates the database tables and relationships. |
| `seed.sql` | Inserts sample data for testing. |
| `queries.sql` | Contains SQL queries for testing and demonstration. |

## 3. Setup Instructions

**Requirements:** PostgreSQL and the `psql` command-line tool.

### Step 1 — Create a Database

```bash
createdb -U YOUR_USERNAME laam_express_dev
```

Skip this step if the database already exists.

### Step 2 — Create Tables

Run from the project root:

```bash
psql -U YOUR_USERNAME -d laam_express_dev -v ON_ERROR_STOP=1 -f database/schema.sql
```

### Step 3 — Insert Sample Data

```bash
psql -U YOUR_USERNAME -d laam_express_dev -v ON_ERROR_STOP=1 -f database/seed.sql
```

Run the seed file once on a new, empty database to avoid duplicate sample data.

### Step 4 — Run Test Queries

```bash
psql -U YOUR_USERNAME -d laam_express_dev -v ON_ERROR_STOP=1 -f database/queries.sql
```

## 4. Verify Database

Connect to PostgreSQL:

```bash
psql -U YOUR_USERNAME -d laam_express_dev
```

List all tables:

```sql
\dt
```

View table structure:

```sql
\d parcel
\d pickup
```

View sample data:

```sql
SELECT * FROM customer;
SELECT * FROM orders;
SELECT * FROM parcel;
SELECT * FROM pickup;
```

Exit PostgreSQL:

```sql
\q
```

## 5. Supported User Stories

The database is designed to support the following web application features:

| User Story | Description | Main Tables |
|---|---|---|
| US-01 | Track parcel status and history. | `parcel`, `parcel_status_history` |
| US-02 | View scheduled pickup appointments. | `pickup`, `employee`, `orders` |
| US-03 | Access relevant customer contact details for pickup or delivery. | `orders`, `pickup`, `employee`, `delivery` |

**Note:** The SQL queries have been tested locally. End-to-end integration with the web application's frontend and backend must be verified separately.

## 6. Testing

Initial local testing includes:

- Creating all 11 tables.
- Inserting sample data.
- Checking Foreign Key constraints.
- Checking UNIQUE constraints.
- Running JOIN queries.
- Testing transactions using `BEGIN` and `ROLLBACK`.

Additional validation, security testing, and business-rule enforcement will be addressed in future updates.

## 7. Development Notes

- `laam_express_dev` is used for local development and testing.
- Avoid running setup scripts against an existing production database without reviewing their effects.
- Changes to `schema.sql` do not automatically modify existing database tables.
- Changes to `seed.sql` do not automatically update existing records.
- Use appropriate migration scripts for future schema changes.
- Database connection credentials must not be committed to GitHub.

## 8. Version History

### V1.0 — Initial Full Database

- Implemented 11 PostgreSQL tables.
- Defined primary and foreign key relationships.
- Added sample data for database testing.
- Added demonstration queries for selected user stories.
- Completed initial integrity and transaction tests.

**Planned V2:** Verify web integration, refine business-rule constraints, and improve database security.