# webBBS

## Version 00.02.00

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

## Quick start (Docker)

1) Set sysop credentials (recommended):

Create a `.env` file (or edit docker-compose env values):

```
SYSOP_HANDLE=sysop
SYSOP_PASSWORD=change-me-now
```

2) Start:

```
docker compose up --build
```

3) Open:
- BBS: `http://localhost:3000/bbs`
- Admin UI: `http://localhost:3000/admin`

The server will:
- wait for Postgres,
- create/update tables (Prisma `db push`),
- bootstrap the sysop account,
- ensure default config exists.

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

Requires Node 20+ and Postgres.

```
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
[getting-started instructions](docs/getting-started.md), [security guidance](docs/security.md),
and [release notes with rollback procedures](docs/release-notes.md).
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

CI also builds the existing Dockerfile from a fresh image and reports the npm
dependency-audit result. A successful build is not a clean security audit;
review audit warnings separately. No production credentials are needed.

Release versions use `xx.xx.xx`; npm uses the equivalent unpadded semver.
The workflow creates a matching version tag and release after validation,
application build, and Pages deployment. Existing tags are never moved.
