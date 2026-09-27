# Changelog

## 00.02.00 (2026-09-27)

Additive
- Add a Jekyll project documentation site under `docs/`, including deployment, security, maintenance, release, and rollback guidance.
- Configure weekly Dependabot version updates for npm, GitHub Actions, and Docker; alerts remain a separate repository setting.
- Add Pages artifact regression tests, JavaScript syntax/configuration checks, fresh Docker build validation, and dependency audit reporting.
- Create versioned GitHub releases after successful main-branch checks and Pages deployment; never move existing tags.

Fix
- Override the theme head include to omit its nonexistent favicon, which the first hosted artifact check correctly rejected before deployment.
- Restrict Pages publishing to `docs/` instead of the repository root, validate local links, pin Actions to commit SHAs, and scope deployment credentials to the deploy job.
- Align `VERSION`, README, Jekyll, and npm release metadata at `00.02.00` / `0.2.0`.

Traceability
- User request: retry security configuration and configure GitHub Pages Jekyll.
- Retain security policy commit `dc66a42d106c28ee8bfb0276496bdbb301e17af3` and CodeQL commit `212c0a07f6fed3df6740f375250dc66b29f8d5d8`.
- Initial setup commit: `35b7bb9db408b6f3a29b5ad400eb3d349dc03ea3`; hosted artifact validation caught the missing theme favicon before publication.
- Baseline commit: `8680fdc292cf1c95658739c74020a41896e4b477`. No issue number was supplied.

Compatibility
- Additive repository tooling and documentation; no breaking runtime, API, CLI, database, or environment changes.
- Application dependency ranges are unchanged. Audit findings and missing admin access are reported, not treated as successful verification.

## 00.01.02 (2026-02-21)

Fix
- Corrected WebSocket handler integration with `@fastify/websocket` (wsHandler receives a `ws` WebSocket object, not a wrapper with `.socket`). This prevents immediate disconnects on page load.

Additive
- Added an HTTP handler on `/ws/bbs` that returns `426 Upgrade Required` with a header debug summary when the request is not upgraded (helps diagnose reverse proxy / Upgrade header issues).
- Client now prints WebSocket close codes/reasons and shows a "Connection error" message on WS errors.
- Added dependency-free WebSocket upgrade helpers and basic unit tests (`node --test`).

Notes
- No schema changes.
