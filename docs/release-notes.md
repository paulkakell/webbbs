---
title: Release notes
permalink: /release-notes/
---

# Release 00.03.03

Date: September 27, 2026 (America/Denver). Classification: backward-compatible
runtime fix, container packaging fix, and additive regression tests/documentation.

## WebSocket correction

The server now uses `await fastify.register(websocket)` before declaring any
application routes or registering static routes. Previously the plugin was only
queued, so its route hooks were unavailable when `/ws/bbs` was defined. The
container could start and serve HTTP pages while real WebSocket connections failed.

This corrects GHCR run `36357562249`, publish job `108728234624`, at baseline
commit `57eaba2043291ae6874fa35a83db336d390607d4` (`00.03.02`). That run passed its
build and dependency audit but stopped before publication at the WebSocket test.
No issue number was supplied. The upstream
[WebSocket plugin documentation](https://github.com/fastify/fastify-websocket#using-hooks)
shows awaited registration before direct route declarations.

The HTTP diagnostic still returns `426 Upgrade Required` for non-upgrade requests.
Successful WebSocket connections must reach the anonymous `Handle:` prompt,
process a blank-handle input, return the prompt, and close normally. A successful
handshake or clear-screen frame alone is not sufficient for the new smoke test.
The existing synchronous event attachment and authentication behavior are unchanged.

The image also includes the repository's existing LICENSE file. All release
metadata and current image references now use `00.03.03`; npm uses `0.3.3`.

## Tests, security, and validation

Nine new dependency-free unit tests exercise the WebSocket probe: successful
round-trip, handshake-only failure, missing reply, connection error, malformed
JSON, malformed ANSI data, output limits, timeout cleanup, and invalid deadlines.
A tenth regression check enforces awaited registration before direct/static routes
and confirms the live integration probe and plain-HTTP diagnostic remain enabled.
These extend the existing 23-test suite without adding dependencies.

The GHCR workflow runs the complete unit/regression suite, repository syntax and
version checks, YAML validation, a fresh Linux amd64 image build, a blocking audit
of every shipped npm dependency, and the disposable PostgreSQL integration suite.
The integration suite retains login validation, anonymous admin denial, database
writes/deletes, cookie checks, session revocation, static-file guard checks, and
the 20-request HTTP timing check. Probe results and timing use structured JSON.
CodeQL and Jekyll build/link validation continue in their existing workflows.

Actual pass/fail results, image digest, and anonymous-pull status must be read
from the release commit's Actions runs. This document does not treat a configured
check or a successful source release as proof of successful container publication.
Local validation covered the nine new probe tests and their JavaScript syntax;
Docker and external network access were unavailable in the editing environment,
so full build/runtime checks run on GitHub's clean hosted runners.

Security review: this patch does not relax authentication, authorization, request
validation, cookie handling, upload paths, or existing logging. The anonymous
probe sends no passwords; it uses a blank handle and bounds output to 65,536
characters with a default 10,000 ms deadline. Workflow permissions, secret masking,
and publication gates are retained. npm audit is not an operating-system scan,
and CodeQL completion alone is not a certification of vulnerability-free code.
No dedicated linter/type-checker is configured; syntax/configuration checks and
CodeQL provide the existing static-analysis coverage. No production load benchmark
or deployment/rollback exercise is claimed by the HTTP timing smoke check.

## Compatibility and deployment

No application API, WebSocket message format, CLI flag, environment variable,
database schema, or dependency-range changes relative to `00.03.02` are introduced.
There are no migrations to apply or reverse. The repository still has no committed
npm lockfile; source rebuilds can resolve different dependencies. Preserve exact
image digests for repeatable deployment. The earlier static/UUID security fixes
remain in place. Root-user execution and the compiler toolchain remain unchanged.

After GHCR publication succeeds, set this value in the existing `.env`:

```dotenv
WEBBBS_IMAGE=ghcr.io/paulkakell/webbbs:00.03.03
```

Then update without changing credentials or storage:

```sh
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

Source installations update their checkout and rebuild with
`docker compose up -d --build`. See the
[container installation guide]({{ '/containers/' | relative_url }}) for all
options, password setup, package authentication, and WebSocket diagnostics.
GitHub package visibility is separate from successful publication.

## Rollback

Record the current digest and back up PostgreSQL and uploaded files before
upgrading. Restore a previously verified, retained image digest in `WEBBBS_IMAGE`
and run the same `pull` and `up -d` commands. Preserve volume paths, database
credentials, and the Compose project name. Never delete production volumes.
Startup still runs Prisma `db push`, even though this patch changes no schema.

The original `00.03.00` through `00.03.02` runs did not publish GHCR images, so
those tags are not assumed to be image rollback targets. Prior source release
`v00.03.02` remains available at the baseline commit, but restores this known
WebSocket defect; `v00.02.00` also predates the container dependency security fixes.
Use retained known-good deployment artifacts where available rather than treating
an older source tag as a proven working or secure runtime. Existing source tags
are never moved. Rollback has been reviewed, not executed on a production host.

## Commit notes

```text
fix(websocket): restore BBS connections in 00.03.03

Await WebSocket plugin registration before declaring application/static routes.
Keep HTTP 426 diagnostics, authentication, and message formats unchanged.
Require terminal prompt, blank-handle round-trip, and clean close in CI.
Add nine probe tests plus a startup-order regression assertion.
Include LICENSE in the image and synchronize release metadata/documentation.
Preserve dependency audit gates, existing tags, credentials, volumes, and schema.
Fixes failed GHCR run 36357562249 at baseline 57eaba2043291ae6874fa35a83db336d390607d4.
```
