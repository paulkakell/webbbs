# webBBS

## Version 00.03.00

A Dockerized, web-served recreation of a classic early-90s BBS experience.

The primary UI is a browser-based ANSI terminal (xterm.js) connected to a server-side BBS state machine over WebSockets.

Key goals:
- “Feels like a BBS”: menus, prompts, ANSI, single-key navigation.
- Fully functional site (not a mock): users, message boards, file areas with ratio/leech enforcement, and modular doors.
- All configuration is stored in the database and can be managed either:
  - inside the BBS (Sysop menu), or
  - via a web Admin UI.

## Features (included)

- Web terminal BBS client (`/bbs`)
- Sysop + user accounts
- Message boards
  - boards, threads, posts
  - simple new-thread and reply workflows
- File areas
  - upload/download through browser while controlled from inside the BBS
  - per-user upload/download stats
  - ratio/leech enforcement (configurable)
  - optional “freeleech” areas/files
- Doors
  - internal door plugin loader (from `./doors/*`)
  - sample door: Guess The Number
- Web Admin UI (`/admin`)
  - login
  - edit BBS config
  - manage boards, file areas
  - install/enable doors

## Quick start: prebuilt GHCR image

Use `ghcr.io/paulkakell/webbbs:00.03.00` on Linux amd64. Download
`docker-compose.ghcr.yml` and `.env.ghcr.example` from this release, then:

```sh
cp .env.ghcr.example .env
chmod 600 .env
# Generate two separate passwords, then enter them in .env.
openssl rand -hex 24
openssl rand -hex 24
# Edit POSTGRES_PASSWORD and SYSOP_PASSWORD before continuing.
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

No Git checkout, Dockerfile, or local build is needed. New GHCR packages default
to private; the owner must make the package public for anonymous pulls, or users
must run `docker login ghcr.io` with a classic token having `read:packages`.
The [container guide](docs/containers.md) includes download commands, all settings,
existing-installation migration, authentication, and rollback.

Open `http://localhost:3000/bbs` or `http://localhost:3000/admin` after startup.
The new Compose file binds to loopback by default. Set `BIND_ADDRESS=0.0.0.0`
for access from other machines, with appropriate firewall and HTTPS protection.
Keep existing volume paths and credentials when switching an existing install.

## Alternative: build from source

The original `docker-compose.yml` still uses `build: .` and requires the complete
repository, not just the Compose file:

```sh
git clone https://github.com/paulkakell/webbbs.git
cd webbbs
cp .env.example .env
mkdir -p .data/postgres .data/files
printf '\nDB_VOLUME=%s/.data/postgres\nAPP_VOLUME=%s/.data/files\n' "$PWD" "$PWD" >> .env
# Edit .env and set a unique SYSOP_PASSWORD before starting.
docker compose up --build -d
```

The original database credentials are for local setup, not internet-facing
production. The server waits for Postgres, applies the Prisma schema with
`db push`, bootstraps the sysop account, and ensures default configuration.
Back up persistent data before upgrading.

## Reverse proxy notes (WebSockets)

The BBS terminal requires WebSockets (`/ws/bbs`). A successful handshake returns HTTP `101 Switching Protocols`.

If your proxy does not forward WebSocket upgrade headers, the browser will disconnect and `/ws/bbs` may return `426 Upgrade Required`.

For Nginx, ensure these headers are forwarded:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "Upgrade";
```

## Local dev (without Docker)

Requires Node 22+ and Postgres.

```sh
cp .env.example .env
npm install
npm run vendor
npm run dev
```

## Door plugins

Door packages live in `doors/<doorId>/` and export a `door` object from `door.mjs`.

Example:
- `doors/guess-number/door.mjs`

On startup, the server scans `./doors` and loads door packages. Sysop/Admin can “install” doors (persisted in DB) and enable/disable them.

## Notes

- This repository is intentionally modular. Most sysop/admin operations are implemented, but the “classic BBS” UI can be extended significantly (newscan pointers, message base indexing, ANSI art packs, external PTY doors, etc.).
- File transfer is performed via browser download/upload, but initiated and controlled from within the BBS UI.

## Documentation and GitHub Pages

The [Jekyll documentation site](https://paulkakell.github.io/webbbs/) contains
[getting-started instructions](docs/getting-started.md), [container installation](docs/containers.md),
[security guidance](docs/security.md), and [release notes with rollback procedures](docs/release-notes.md).
GitHub Pages hosts documentation only, not the running Node.js BBS.

Edit `docs/` and push to `main` to publish. Pull requests run checks and build
previews without deploying. Pages must use **GitHub Actions** as its source.
Configuration and local-build examples are in `docs/getting-started.md`.

## Security and validation

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
CodeQL scans application code. Dependabot proposes npm, GitHub Actions, and
Docker updates weekly; alert settings are separate and no updates auto-merge.

```sh
npm test              # all checked-in tests
npm run check         # syntax, version, workflow, and configuration checks
npm run pages:verify  # generated _site artifact and local links
```

The GHCR workflow runs these repository tests and syntax checks, builds a fresh
image, audits all shipped npm dependencies, and tests a disposable PostgreSQL
stack before publication. Authentication, authorization, database writes,
session revocation, and WebSocket upgrades are covered by the smoke check.
Its summary records the verified digest; npm audit is not an OS-package scan.
Dependency ranges remain unlocked, so use published digests rather than assuming
source rebuilds produce identical images.

Release versions use `xx.xx.xx`; npm uses the equivalent unpadded semver.
The Pages workflow creates the matching source tag and release after its own
validation, application build, and deployment. The GHCR workflow independently
publishes version/commit image tags and updates `latest` only for current main.
Check both workflows: a source release alone does not prove the image was pushed.
Existing source tags are never moved.
