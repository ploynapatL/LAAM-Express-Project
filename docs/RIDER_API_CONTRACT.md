# US2-US3 PostgreSQL API contract

Base URL: `http://localhost:3001`. All operations are GET/read-only.
These contracts are implemented but have not yet been verified against a running database.

Send `Authorization: Bearer <opaque-token>` for all routes below. Configure tokens only on
the server via `RIDER_TOKENS_JSON` mapping secrets (32+ characters without whitespace) to
integer `employee.employee_id`. Missing configuration denies all rider requests.
`employee.role` is re-read for every request. Browser-supplied employee IDs are not used.
This temporary credential mechanism requires replacement when the team defines login/session auth.

| Endpoint | Success |
|---|---|
| `/api/riders/me` | `{ "riderId": 1, "role": "Pickup Rider" }` |
| `/api/riders/me/pickups` | `{ "riderId": 1, "assignments": [...] }` |
| `/api/riders/me/deliveries` | `{ "riderId": 2, "assignments": [...] }` |
| `/api/tasks/:taskId/contact` | `{ "taskId": "P-1-O-1", "phone": "0811111111" }` |

Assignment example from fresh seed:

```json
{
  "taskId": "P-1-O-1",
  "type": "pickup",
  "date": "2026-11-16",
  "startTime": "10:00",
  "endTime": null,
  "address": "Bangkok, Customer A",
  "status": "Successful",
  "note": null
}
```

Pickup task IDs include both pickup and order IDs because one appointment can cover
multiple orders with different senders. Pickups without orders are omitted. Only the assigned
`Pickup Rider` sees these tasks. Contact returns the order's `sender_phone`.
Delivery IDs are `D-<delivery_id>` and expose each assigned delivery attempt separately.
Only the assigned `Delivery Rider` sees these tasks; contact returns `orders.receiver_phone`.
Delivery address is `orders.receiver_address`; all schedule fields are null because
the schema has no delivery appointment. `delivery_date` is not used as a scheduled date.
Pickup endTime and note are also unavailable. Nullable addresses are preserved as null.
Lists contain current and completed tasks, ordered by appointment then IDs (delivery by ID).
The other rider role's list returns 200 with `assignments: []`, supporting the two-tab UI.

| HTTP | Meaning |
|---|---|
| 200 | Authorized result; assignment list may be empty |
| 400 | Invalid task ID (positive PostgreSQL integer IDs required) |
| 401 | Missing/invalid bearer credential; includes `WWW-Authenticate: Bearer` |
| 403 | Missing employee, non-rider employee or wrong role for contact task type |
| 404 | Task missing, not owned, pickup/order mismatch, or phone missing/blank |
| 500 | Repository/database failure; no SQL or credential details returned |

Errors use `{ "error": "message" }`. Rider responses include `Cache-Control: no-store`
and vary by Authorization. The contact query includes employee ownership and order association
in its WHERE clause. It does not fall back to account-holder phone or expose customer records.
Frontend validates a dialable number before creating a `tel:` link and keeps credentials in
memory only. Data from older requests is discarded when credentials or selected task change.

The trusted backend read role is prepared in `database/backend_read_access.sql`.
It is not row-level security and must never be handed to browser users.
See [setup and pending assumptions](US1_US3_SETUP_TH.md).
