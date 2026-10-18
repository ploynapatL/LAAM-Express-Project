# CBE205 Week 9 starter — Express API + minimal browser frontend
This intentionally minimal scaffold avoids imposing a frontend framework. Teams can replace the static frontend with their chosen CBE204-compatible frontend later. Data is in memory and resets when server restarts.

## Prerequisites
Node.js 20+ and npm; Git recommended. Run from two terminals.

## Terminal 1: backend
```sh
cd server
npm install
npm start
```
Open http://localhost:3001/api/health and verify `status: ok`.

## Terminal 2: frontend
From `client/`, run `python3 -m http.server 8080` (or VS Code Live Server). Open http://localhost:8080 and verify `API: ok`. Add an item and confirm it appears. Browser should call backend port 3001.

## API checks
```sh
curl http://localhost:3001/api/health
curl http://localhost:3001/api/items
curl -X POST http://localhost:3001/api/items -H 'Content-Type: application/json' -d '{"name":"Demo item"}'
curl -X POST http://localhost:3001/api/items -H 'Content-Type: application/json' -d '{}'
```
Last command should return HTTP 400. Use `curl -i` to see status codes.

## Team adaptation task
Replace generic `items` with one simple domain-specific resource and fields. Update UI, API, README and SRS traceability. Do not treat this demo as production ready: no persistent database, auth, advanced validation, tests or deployment automation. CBE204 authentication may be consulted as a reference but is not a Sprint 0 gate.
