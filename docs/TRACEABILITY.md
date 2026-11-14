
# LAAM Express — Requirements Traceability

## 1. Purpose

This document connects the system's User Stories and Functional Requirements to Business Rules, ER relationships, PostgreSQL tables, and SQL queries.

It demonstrates how requirements are implemented in the database.

## 2. Requirements Traceability Matrix

| ID | Functional Requirement | Business Rule | ER Entities / Relationships | Database Implementation |
|---|---|---|---|---|
| FR-01 | Track a parcel using its tracking number | Each parcel has a unique tracking number; tracking history is recorded | Order 1–1 Parcel; Parcel 1–many StatusHistory | `parcel.tracking_number` UNIQUE; `parcel_status_history.parcel_id` FK |
| FR-02 | View scheduled pickup appointments | Pickup requests must record date and time | Pickup 1–many Orders; Employee 1–many Pickups | `pickup.appointment_date`, `appointment_time`, `employee_id`; `orders.pickup_id` FK |
| FR-03 | Access contact details for assigned deliveries or pickups | Authorized riders should access only relevant customer information | Employee–Pickup–Order; Employee–Delivery–Parcel–Order | `orders.sender_phone`, `receiver_phone`, addresses; backend authorization required |
| FR-04 | Update parcel delivery status | Status transitions must follow the workflow and be logged | Parcel 1–many StatusHistory; Employee 1–many StatusHistory | `parcel.current_status`; `parcel_status_history`; status-update function and trigger |
| FR-05 | Confirm successful delivery | Delivery requires photo or digital signature | Parcel 1–many Deliveries | `delivery.delivery_status`, `proof_of_delivery`; CHECK constraint |
| FR-06 | Validate special parcel services | Chilled/Frozen parcels require Express | Order 1–1 Parcel | `orders.service_type`, `parcel.parcel_type`; validation triggers |
| FR-07 | Manage COD transactions | COD collection and settlement must be recorded | Order 1–0..1 COD | `cod.order_id` UNIQUE FK; settlement fields and constraints |
| FR-08 | Apply coupon discounts | Maximum one coupon per order | Coupon 1–many Orders | `orders.coupon_id` FK |
| FR-09 | Manage customer orders | Each order belongs to a customer | Customer 1–many Orders | `orders.customer_id` NOT NULL FK |
| FR-10 | Record parcel payments | An order can have multiple payments | Order 1–many Payments | `payment.order_id` FK; amount CHECK |

## 3. Detailed Traceability Examples

### Example A — FR-01: Parcel Tracking

**User Story**

As a sender or receiver, I want to track my parcel so that I can know its current delivery status.

**Business Rules**

- Every parcel must have a unique tracking number.
- Every status change must be recorded with a timestamp and location.
- Status changes must follow the permitted workflow.

**ER Design**

- One Order can have at most one Parcel in the implemented schema.
- One Parcel can have multiple StatusHistory records.
- Each StatusHistory record belongs to exactly one Parcel.

**Tables and Constraints**

- `parcel.parcel_id`: Primary Key
- `parcel.tracking_number`: UNIQUE, NOT NULL
- `parcel.current_status`: Current status
- `parcel_status_history.parcel_id`: Foreign Key
- `parcel_status_history.timestamp`: Status timestamp
- `parcel_status_history.location`: Status location

**SQL Demonstration**

```sql
SELECT p.tracking_number,
       p.current_status,
       h.status,
       h.timestamp,
       h.location
FROM parcel p
JOIN parcel_status_history h
  ON h.parcel_id = p.parcel_id
WHERE p.tracking_number = 'LAAM001'
ORDER BY h.timestamp, h.status_history_id;
```

**Explanation**

The query joins `parcel` and `parcel_status_history` using `parcel_id`. The unique tracking number identifies the parcel, while the history table provides its status timeline.

### Example B — FR-02: Pickup Rider Schedule

**User Story**

As a pickup rider, I want to view scheduled pickup times so that I can plan my pickup route efficiently.

**Business Rules**

- Pickup appointments must include a date and time.
- Pickup appointments can be assigned to employees.
- A pickup appointment may be linked to multiple orders.

**ER Design**

- One Employee can be assigned multiple Pickups.
- One Pickup can be associated with multiple Orders.
- Each Order has at most one Pickup reference.

**Tables and Constraints**

- `pickup.pickup_id`: Primary Key
- `pickup.employee_id`: Foreign Key
- `pickup.appointment_date`: NOT NULL
- `pickup.appointment_time`: NOT NULL
- `orders.pickup_id`: Foreign Key

**SQL Demonstration**

```sql
SELECT e.name AS rider,
       pu.pickup_id,
       pu.appointment_date,
       pu.appointment_time,
       pu.pickup_location,
       COUNT(o.order_id) AS order_count
FROM pickup pu
JOIN employee e
  ON e.employee_id = pu.employee_id
LEFT JOIN orders o
  ON o.pickup_id = pu.pickup_id
GROUP BY e.name, pu.pickup_id,
         pu.appointment_date,
         pu.appointment_time,
         pu.pickup_location
ORDER BY pu.appointment_date,
         pu.appointment_time;
```

**Explanation**

The query joins pickup appointments with assigned employees and counts associated orders. The `GROUP BY` and `COUNT` operations help riders understand their scheduled workload.

### Example C — FR-03: Rider Contact Details

**User Story**

As a rider, I want to access customers' contact information so that I can communicate with them regarding parcel pickup or delivery.

**Business Rule**

Riders should only access contact details relevant to their assigned work.

**ER Design**

Employee → Pickup → Order

For delivery assignments:

Employee → Delivery → Parcel → Order

**Tables**

- `employee.employee_id`
- `pickup.employee_id`
- `orders.pickup_id`
- `orders.sender_name`, `sender_phone`, `sender_address`
- `orders.receiver_name`, `receiver_phone`, `receiver_address`

**SQL Demonstration**

```sql
SELECT e.name AS rider,
       pu.pickup_id,
       o.order_id,
       o.sender_name,
       o.sender_phone,
       o.sender_address,
       o.receiver_name,
       o.receiver_phone,
       o.receiver_address
FROM pickup pu
JOIN employee e
  ON e.employee_id = pu.employee_id
JOIN orders o
  ON o.pickup_id = pu.pickup_id
WHERE e.employee_id = 1
ORDER BY pu.appointment_date, o.order_id;
```

**Explanation**

The query retrieves customer contact information for pickup appointments assigned to a selected employee.

The employee ID must come from a verified backend session, not from an untrusted user-supplied parameter.

## 4. Data Integrity

PostgreSQL constraints help prevent invalid records.

- Primary Keys uniquely identify rows.
- Foreign Keys maintain relationships.
- UNIQUE constraints prevent duplicate tracking numbers.
- NOT NULL constraints require mandatory values.
- CHECK constraints validate amounts, statuses, and business conditions.
- Triggers validate selected cross-table rules and workflow transitions.

## 5. Transaction Management

Database operations involving multiple related changes should use transactions.

For example, updating a parcel status and inserting its history record must succeed together.

The status-update function performs these changes within one database transaction.

If an error occurs, the transaction can be rolled back to avoid inconsistent data.

## 6. Security

The database defines restricted PostgreSQL roles for tracking, pickup scheduling, and finance operations.

Permissions are managed using GRANT and REVOKE.

Additional backend authentication and authorization are required to ensure customers only access their own orders and riders only access assigned tasks.

## 7. Verification Evidence

The following checks were completed during development:

- 11 database tables created successfully.
- 12 database integrity tests passed on a fresh test database.
- Migration 001 succeeded on a restored development database.
- Migration 001 succeeded on `laam_express_dev`.
- Parcel count remained 3 before and after migration.
- Database triggers were listed and verified after migration.

## 8. Implementation Limitations

The following rules are not fully enforced by the current database scripts alone:

- Automatic return of unclaimed parcels after 7 days.
- COD settlement within 2 business days.
- Complete shipping fee calculation.
- Customer-specific access to orders.
- Rider-specific access to contact information.
- Complete application authentication and authorization.

These require additional backend logic, scheduled jobs, or security policies.

## 9. Conclusion

The LAAM Express database design connects functional requirements to database entities, relationships, constraints, and SQL queries.

The implementation supports the core parcel tracking and pickup use cases, while providing integrity controls, transaction handling, and a foundation for role-based access.
