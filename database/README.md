# LAAM Express — Database Setup

## US-01: Parcel Tracking

This database supports parcel tracking by tracking number, including current delivery status and tracking history.

### Technology
- Database: PostgreSQL
- Database name: `laam_express`

### Database Files

| File | Purpose |
|---|---|
| `schema.sql` | Creates parcel and parcel_status_history tables |
| `seed.sql` | Inserts sample parcel and tracking history data |
| `queries.sql` | Contains SQL queries for parcel tracking |

### Setup Instructions

Run the following commands from the project root directory (`LAAM-Express-Project`).

**1. Create Database**

```bash
createdb laam_express
```

If the database already exists, skip this step.

**2. Create Tables**

```bash
psql -v ON_ERROR_STOP=1 -d laam_express -f database/schema.sql
```

**3. Insert Sample Data**

```bash
psql -v ON_ERROR_STOP=1 -d laam_express -f database/seed.sql
```

**4. Test Tracking Queries**

```bash
psql -v ON_ERROR_STOP=1 -d laam_express -f database/queries.sql
```

### Sample Tracking Numbers

| Tracking Number | Current Status |
|---|---|
| LAAM001 | In Transit |
| LAAM002 | Delivered |
| LAAM003 | Order Created |

### Backend Integration

The backend should connect to PostgreSQL and retrieve tracking information using parameterized SQL queries.

Suggested endpoint:

`GET /api/tracking/:trackingNumber`

The backend should retrieve:

- Tracking number
- Current parcel status
- Destination zone
- Tracking history (status, timestamp, location)

The backend is responsible for the PostgreSQL connection, API implementation, error handling, and JSON responses.

### Notes

This is the initial database implementation for US-01 only. The Order and Employee foreign key relationships will be integrated when their corresponding tables are implemented.

Do not commit database passwords or local environment credentials to GitHub.