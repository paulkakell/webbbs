# Changelog

## 00.01.02 (2026-02-21)

Fix
- Corrected WebSocket handler integration with `@fastify/websocket` (wsHandler receives a `ws` WebSocket object, not a wrapper with `.socket`). This prevents immediate disconnects on page load.

Additive
- Added an HTTP handler on `/ws/bbs` that returns `426 Upgrade Required` with a header debug summary when the request is not upgraded (helps diagnose reverse proxy / Upgrade header issues).
- Client now prints WebSocket close codes/reasons and shows a "Connection error" message on WS errors.
- Added dependency-free WebSocket upgrade helpers and basic unit tests (`node --test`).

Notes
- No schema changes.
