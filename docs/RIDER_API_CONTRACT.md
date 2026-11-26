# Rider Assignments API

Express serves the website and API on the same origin. The website uses the account session cookie. Existing API clients can send a Bearer token configured in `RIDER_TOKENS_JSON`.

Both existing rider roles can view pickup and delivery tasks assigned to their own employee ID. The server obtains the employee ID from the session or token.

| GET endpoint | Result |
|---|---|
| `/api/riders/me` | Rider ID and employee role |
| `/api/riders/me/route` | `{ riderId, stops }` with both types of task |
| `/api/riders/me/pickups` | `{ riderId, assignments }` filtered to pickups |
| `/api/riders/me/deliveries` | `{ riderId, assignments }` filtered to deliveries |
| `/api/tasks/:taskId/contact` | `{ taskId, phone }` for a task assigned to the rider |

Each route stop contains `stopId`, `routeDate` (YYYY-MM-DD), `stopOrder`, `location`, and `tasks`. The API returns planned stops by date and stop order, then unplanned tasks grouped by address. An unplanned group's stop ID, date and order are null. Tasks without a known address are displayed separately.

Each task contains `taskId`, `type` (`pickup` or `delivery`), `date`, `startTime`, `endTime`, `address`, `status`, and `note`. Pickup task IDs have the format `P-<pickup_id>-O-<order_id>`, so one pickup for two orders is represented by two tasks. Pickups need an associated order to show in the list. Delivery IDs have the format `D-<delivery_id>`. Delivery task dates and times stay null because a route date is a day on the plan and `delivery_date` records the actual delivery event.

Pickup contact returns the order's sender phone. Delivery contact returns the receiver phone. The contact query checks the employee's assignment and, for pickups, the association with the order.

| HTTP | Meaning |
|---|---|
| 200 | Authorized result, including an empty list |
| 400 | Malformed task ID |
| 401 | Missing or invalid authentication |
| 403 | Account is ineligible for rider access |
| 404 | Task does not belong to the rider, does not exist, or has no contact number |
| 500 | Repository or database error |

Responses use `Cache-Control: no-store` and vary by Authorization and Cookie. See [the current setup guide](../README.md) for required migrations.
