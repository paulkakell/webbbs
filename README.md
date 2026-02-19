# webBBS

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

