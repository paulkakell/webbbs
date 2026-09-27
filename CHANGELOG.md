# Changelog

## 00.03.01 (2026-09-27)

Fix
- Update `@fastify/static` to `^10.1.5` to address GHSA-8pvw-jcv7-9cmj and GHSA-83w8-p2f5-377r, and `uuid` to `^11.1.1` for GHSA-w5hq-g745-h8pq. Keep the blocking audit; do not force or bypass findings.
- Add isolated static-file guard regression checks and verify the terminal assets in the disposable-stack integration test.
- Correct GHCR installation references to `00.03.01`. The `00.03.00` source release exists, but its GHCR publication was correctly blocked by two dependency findings and no image was pushed.

Traceability and compatibility
- Corrects commit `b39ad40bf94ef2c9c407d1a62182df4d74c740f7`, publication run `36356970007`.
- Dependency major versions changed for security fixes. Fastify remains on 5.x; test static serving, protected routes, startup, and sessions before publishing. UUID package APIs are not used by checked-in application code; Prisma and Node UUID generation are unchanged.
- No application API, database schema, or production data changes. Existing source tags remain untouched; no `00.03.00` image is an available rollback target.

## 00.03.00 (2026-09-27)

Additive
- Publish tested Linux amd64 images to `ghcr.io/paulkakell/webbbs` with padded version, full commit, and latest tags. Record the pulled-back registry digest for traceability.
- Add a standalone GHCR Compose file and environment template so installation no longer requires a local Dockerfile. Preserve the original source-build Compose file.
- Add seven deployment regression tests and disposable PostgreSQL integration checks covering startup, login validation, authorization, database writes, logout, and WebSocket upgrades.
- Document package visibility, all deployment variables, existing-volume migration, release pinning, and rollback. Require explicit passwords and default new deployments to loopback binding.

Fix
- Move the container from end-of-life Node 20 to the Node 22 LTS line and exclude common secret/data paths from Docker's build context.
- Block image publication on npm audit findings across all shipped dependencies, including the runtime Prisma CLI.
- Align release metadata at `00.03.00` / `0.3.0`.

Traceability and compatibility
- User request: publish the application to GHCR after the Compose-only installation failed to find Dockerfile. No issue number supplied.
- Baseline: `66ed37f90d1442b8882723fbba05176b3b6e47f9`; release commit is identified by `v00.03.00` and the image revision label.
- Additive deployment path; existing Compose, API, database schema, and application dependency ranges are unchanged. Node runtime changes only in the container. No database migration is introduced.
- New package visibility remains a separate owner setting. Published digests are the exact rollback artifacts; source rebuilds remain unlocked.

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
