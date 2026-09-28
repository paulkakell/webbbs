# webBBS

## Version 00.04.00

A Dockerized, web-served recreation of an early-90s BBS. The browser ANSI terminal
uses xterm.js and WebSockets to connect to a server-side BBS state machine.

## Features

- BBS terminal at `/bbs`, sysop and user accounts, and administration at `/admin`.
- Message boards, threads, posts, and user profiles.
- Browser uploads/downloads initiated from the terminal, with upload/download
  statistics, configurable ratio enforcement, and freeleech areas/files.
- Internal JavaScript door plugins and administration controls.
- Three original games bundled and enabled on first discovery:
  **World Conquest**, **Lantern Hollow**, and **Modem Mogul**.
- The existing Guess The Number and ANSI Clock packages are retained.

World Conquest offers a 12-territory shared match for 2-4 players and separate
saved CPU campaigns. Lantern Hollow offers nine shared fantasy rooms, live
combat, chat, equipment, and a quest. Modem Mogul lets each caller run a fictional
BBS business, with equipment, employees, daily events, and a leaderboard.

These are original native games inspired by the requested territory-strategy,
MUD, and sysop-simulation categories. They are not copies of Global War, DoorMUD,
or Virtual Sysop III, and do not contain their binaries, maps, text, or assets.

## Quick start: prebuilt GHCR image

Use `ghcr.io/paulkakell/webbbs:00.04.00` on Linux amd64 only after that release's
GHCR workflow succeeds. A source tag alone does not establish image availability.
Download `docker-compose.ghcr.yml` and `.env.ghcr.example` from the same release:

```sh
cp .env.ghcr.example .env
chmod 600 .env
# Generate separate passwords, then enter them in .env.
openssl rand -hex 24
openssl rand -hex 24
# Set POSTGRES_PASSWORD and SYSOP_PASSWORD before starting.
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

Open `http://localhost:3000/bbs` or `http://localhost:3000/admin`.
The initial handle is `sysop` unless `SYSOP_HANDLE` is changed. Bootstrap settings
are not a password-reset mechanism for existing accounts.

New deployments bind to loopback. For access from other machines, configure
`BIND_ADDRESS`, a firewall, and an HTTPS reverse proxy. Keep existing credentials,
ports, network settings, and volume paths when upgrading an existing installation.
GHCR package visibility is independent of publication: private packages require
authorized registry login. See the [container guide](docs/containers.md).

## Play the bundled doors

Log in, open **Doors**, and choose a game by its displayed number. Type `HELP`
inside any game. Every accepted action saves automatically to PostgreSQL; `Q`
returns to the door menu. Examples:

```text
World Conquest: SOLO -> REINFORCE 1 3 -> ATTACK 1 2 -> END
Lantern Hollow: NORTH -> ATTACK -> STOP -> SOUTH -> REST
Modem Mogul: NAME Copper Line -> BUY MODEM -> NEXT -> STATUS
```

The [game guide](docs/bundled-doors.md) documents every command, examples, limits,
multiplayer behavior, save formats, and administration. The normal startup scan
installs the packages. An existing disabled setting stays disabled on rescans.
No external game server, emulator, additional account, API key, or new environment
variable is needed. Command text is limited to printable ASCII in these games.

## Build from source

The original `docker-compose.yml` uses `build: .` and therefore requires the
complete repository, including its Dockerfile:

```sh
git clone https://github.com/paulkakell/webbbs.git
cd webbbs
cp .env.example .env
mkdir -p .data/postgres .data/files
printf '\nDB_VOLUME=%s/.data/postgres\nAPP_VOLUME=%s/.data/files\n' "$PWD" "$PWD" >> .env
# Set unique credentials in .env before starting.
docker compose up --build -d
```

For local development, install Node 22 and PostgreSQL, configure `.env`, then run
`npm install`, `npm run prisma:generate`, `npm run db:push`, `npm run bootstrap`,
`npm run vendor`, and `npm run dev`.

## Database upgrade and rollback

Back up the database and retain the current image before upgrading. Startup
continues to use Prisma `db push`; this release adds only the `DoorSave` table.
Existing account, message, transfer, and configuration schemas remain unchanged.

Do not start an old image against the new public save table without the rollback
procedure. The old schema may refuse to proceed. The SQL scripts in `ops/` archive
saves outside the managed public schema and can restore them later. They do not
use `--accept-data-loss`. See [release notes](docs/release-notes.md) for commands.

## Reverse proxies and WebSockets

The terminal requires `/ws/bbs` to upgrade successfully with HTTP 101. For Nginx:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "Upgrade";
```

A normal HTTP request to that endpoint intentionally returns 426. The startup
registration-order fix from 00.03.03 is retained; proxy changes do not substitute
for running a corrected image.

## Door development and validation

A package uses `doors/<doorId>/manifest.json` and exports `door` from `door.mjs`.
The existing `createModule`, `enter`, `onLine`, and exit callback contract remains
unchanged. External PTY doors are still not implemented.

```sh
npm test
npm run check
npm run pages:verify     # after generating _site with Jekyll
```

The new dependency-free tests cover gameplay, authorization, retries, persistence,
timer cleanup, configuration, and a bounded engine benchmark. Container integration
also exercises real PostgreSQL concurrency and schema rollback/restore:

```sh
# Disposable stack ONLY; refuses a database that already contains game saves.
docker compose -f docker-compose.ghcr.yml exec -T \
  -e WEBBBS_DOOR_INTEGRATION=1 webbbs_app node scripts/smoke-doors.mjs
```

CI retains the full test suite, repository/YAML checks, fresh Docker builds,
blocking npm audit, existing authentication/WebSocket integration, and CodeQL.
No dependencies or ranges are added or changed for these doors. The project still
has no committed npm lockfile; retain verified image digests for reproducibility.

## Documentation and security

The [documentation site](https://paulkakell.github.io/webbbs/) includes
[getting started](docs/getting-started.md), [containers](docs/containers.md),
[games](docs/bundled-doors.md), [security](docs/security.md), and
[release notes](docs/release-notes.md). Pages hosts documentation, not the Node app.
Edit `docs/` on `main` to publish; Pages must use GitHub Actions as its source.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
Read [CHANGELOG.md](CHANGELOG.md) for release classifications and traceability.
Release versions use `xx.xx.xx`; npm uses the equivalent unpadded semantic version.
Existing tags are never moved. Consult both Pages and GHCR workflow results before
treating a source release as a published, validated container.
