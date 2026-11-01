# US-01 / UC-02 — Tracking API contract (proposed)

**Source:** Week 10 Assignment (Revise1), pp. 2–3 (UC-02) and pp. 12–13 (technical API plan); US Homework spreadsheet p. 1.

## Approved behavior from coursework
- A sender or receiver can track by tracking number **without login**.
- A **read-only** lookup returns current status, latest location and timestamp, and available tracking history.
- A missing parcel returns **404**; a valid parcel with no updates still returns status and an empty history.
- Staff updates are recorded with timestamp, location and employee internally; **do not expose employee IDs to public tracking users**.
- Endpoint specified: `GET /api/tracking/:trackingNo`; expected `200 OK`, `404 Not Found`.

## Proposed response schema (must be confirmed with backend group)

`GET /api/tracking/LAAM20260001`

HTTP 200:
```json
{
  "trackingNumber": "LAAM20260001",
  "currentStatus": "Sorting",
  "latestLocation": "Bangkok Sorting Hub",
  "updatedAt": "2026-10-31T09:45:00+07:00",
  "serviceType": "Standard Delivery",
  "origin": "Chiang Mai",
  "destination": "Bangkok",
  "history": [
    { "status": "Sorting", "location": "Bangkok Sorting Hub", "timestamp": "2026-10-31T09:45:00+07:00" },
    { "status": "Received", "location": "Chiang Mai Branch", "timestamp": "2026-10-30T15:20:00+07:00" }
  ]
}
```

HTTP 404:
```json
{"error":"Tracking number not found"}
```

Use `history: []` when there are no tracking events. The frontend will show the parcel's `currentStatus` even if `history` is empty. Missing optional metadata are displayed as “Not available.”

### Proposed public states
- Awaiting Handover
- Received
- Sorting
- Out for Delivery
- Delivery Failed
- Delivered
- Returned

The state names are aligned with the Week 10 state diagram, but the backend owns validation of transitions. No frontend action may change a status in this sprint.

### Backend responsibilities / integration reminders
1. Validate and normalize tracking numbers, query the database with parameterized queries, return public safe fields only.
2. Source `currentStatus` and `history` consistently from stored parcel/tracking events, with timestamps and locations. Employee IDs are internal.
3. Distinguish **404 parcel missing** from **200 parcel exists with no updates**.
4. Add rate limiting and monitoring to the unauthenticated lookup (to reduce tracking-number enumeration); consider non-guessable tracking numbers. Do not reveal sender/recipient names, addresses, phone numbers, signatures or delivery proof photos through this public endpoint.
5. Never accept caller-supplied status updates through this GET endpoint. Use correct status codes, content type, predictable error JSON and cache controls. For different frontend/backend origins, configure CORS for the approved frontend origin.
6. Confirm privacy scope for origin/destination; this demo displays only city/branch-level labels, not personal addresses.

### Frontend configuration
`frontend/js/config.js`: API_BASE_URL defaults to `''` (same-origin). For a separate backend, supply its origin (for example `http://localhost:3000`) and enable CORS appropriately. Production deployments must serve the frontend and expose the API or proxy `/api/tracking/` to the backend. The `dev-server.js` bundled here is mock-only and **must not** be used as a production implementation.

### Divergent document numbering
The first part of the Week 10 file calls tracking `UC-02`, while its technical API plan calls tracking `US-01`. The User Story PDF calls tracking `US-01`. We use **US-01 / UC-02: Parcel Tracking** for this sprint.

### UI mapping
- **Wireframe page 1:** My Parcels list. The user story has no customer order-list endpoint or auth contract; therefore this sprint uses *clearly labeled fictional demo parcels* as the list, and real users can enter a tracking number to open page 2.
- **Wireframe page 2:** Parcel detail view, current status, status history.
- **Contact your Rider:** visible but disabled; requires a separately defined authenticated/authorized contact feature and privacy agreement; rider-contact endpoint in Week 10 is for authorized riders to access customer contact data, **not** the reverse.

### Explicit design decisions to confirm with your team
- Is “My Parcels” a genuine authenticated user list in a future sprint? If so, define `GET /api/customers/me/parcels` separately, with authorization.
- Will `trackingNumber` always be alphanumeric with hyphens, and length 4–64?
- Should the public response include serviceType, origin and destination at all? They are optional UI enhancements, **not** mandatory Week 10 fields.
- Are no-update parcels represented as `history: []` or is an initial event created on payment confirmation?
- Do you require language switching (Thai/English) or a specific font?
