---
title: Release notes
permalink: /release-notes/
---

# Release 00.04.00

[Home]({{ '/' | relative_url }}) | [Game guide]({{ '/bundled-doors/' | relative_url }}) | [Containers]({{ '/containers/' | relative_url }})

## Included by default

World Conquest supplies territory strategy with 2-4 player shared matches and
private CPU campaigns. Lantern Hollow supplies a nine-room shared adventure with
three-second combat, room chat, equipment, and a quest. Modem Mogul supplies a
saved BBS business with daily advances, equipment, staffing, events, and scores.
All three are original native implementations, not third-party game distributions.
The existing sample doors remain available.

New packages install and enable on startup. Existing disabled settings stay
unchanged. Log in, select Doors, and use `HELP` in each game. The
[game guide]({{ '/bundled-doors/' | relative_url }}) describes every command and
limit. This is an additive feature release, using npm version `0.4.0`.

## Upgrade

Retain the currently running image and take a database backup before proceeding.
Keep existing `.env`, passwords, host port, network definitions, and volume paths.
The following examples assume the standard Compose service and database names:

```sh
# Keep this backup private: it contains account and BBS data.
umask 077
docker compose -f docker-compose.ghcr.yml exec -T webbbs_db \
  pg_dump -U bbs -d bbs > webbbs-before-00.04.00.sql
# Record the exact current image ID/digest before pulling a new version.
docker compose -f docker-compose.ghcr.yml images --quiet webbbs_app
# Save the current image by that ID to a local archive as an additional safeguard.
# docker image save <recorded-image-id> -o webbbs-previous-image.tar
```

Set `WEBBBS_IMAGE=ghcr.io/paulkakell/webbbs:00.04.00` only after the GHCR workflow
has published it, then pull and recreate the app. Keep a record of the verified
digest. The existing startup `prisma db push` adds DoorSave without changing
existing tables. `ops/00.04.00-up.sql` provides an optional idempotent explicit SQL
equivalent. Do not run a migration tool and application startup concurrently.

```sh
docker compose -f docker-compose.ghcr.yml pull webbbs_app
docker compose -f docker-compose.ghcr.yml up -d webbbs_app
```

No additional environment variables or dependency changes are required. Source
builds remain unlocked because the baseline repository has no npm lockfile.
Use published digests or retain your own tested image rather than assuming that
rebuilding the same source later produces the same dependency set.

## Roll back without deleting game saves

Download the `ops/` SQL files from the 00.04.00 source release before attempting a
rollback. Stop application writes first. Do not delete database volumes, and do
not add `--accept-data-loss` to the old startup command.

```sh
docker compose -f docker-compose.ghcr.yml stop webbbs_app
docker compose -f docker-compose.ghcr.yml exec -T webbbs_db \
  psql -v ON_ERROR_STOP=1 -U bbs -d bbs < ops/00.04.00-rollback.sql
```

The rollback script moves DoorSave into the `webbbs_rollback_000400` schema and
disables the three new package entries. Existing BBS records are not modified.
The script refuses to overwrite an existing archive. Set `WEBBBS_IMAGE` to the
previous verified image digest or load your retained image archive, then recreate
the application. The old schema no longer sees an unexpected public DoorSave
table. A previous source tag alone is not proof of an available image.

To return to 00.04.00 and restore saved progress, stop the old application and run:

```sh
docker compose -f docker-compose.ghcr.yml exec -T webbbs_db \
  psql -v ON_ERROR_STOP=1 -U bbs -d bbs < ops/00.04.00-restore.sql
```

Restore before starting 00.04.00; it must not have created a second public
DoorSave table. If both copies exist, the script fails rather than discarding
either one. Resolve that case from backups deliberately. Restore does not
re-enable games: review and enable them individually in Admin.

## Validation and operational review

`npm test` includes all existing tests and the new door suite. `npm run check`
checks JavaScript syntax and release/workflow configuration. CI runs fresh image
builds, a blocking dependency audit, the existing authentication and WebSocket
checks, and the new disposable door integration checks. CodeQL and Pages checks
are retained. The integration test exercises real conflicting writes, persistence
through a second client, disabled-door rejection, idempotent upgrade SQL, old-model
`db push` after archival, and save-preserving restoration.

Run `scripts/smoke-doors.mjs` only in a disposable stack with
`WEBBBS_DOOR_INTEGRATION=1`. It refuses a database already containing game saves.
It creates test accounts and game data and temporarily changes the game schema.
The script is not a production health check. CI results, not this prose, establish
whether a particular release commit passed. A Pages/source release alone does
not establish successful GHCR publication.

No new authentication endpoints, external services, or secrets are introduced.
Runtime game errors are structured and omit game text and credentials. Shared
world state is intended for a small BBS; engine timing is not a concurrency/load
capacity claim. See the game guide for rate, presence, storage, and retention limits.

## Commit notes

```text
feat(doors): bundle three original games in 00.04.00

Add World Conquest, Lantern Hollow, and Modem Mogul as enabled native doors.
Persist individual and shared state with serializable PostgreSQL transactions.
Validate account access, door enablement, input, quantities, and save versions.
Add live combat, timer cleanup, scores, bounded retries, and daily simulation turns.
Add gameplay, concurrency, regression, performance, and rollback tests.
Document all commands, deployment, schema changes, limits, and rollback.
Preserve existing APIs, sample doors, environment names, and dependency ranges.
```

Baseline: `7739893538c0ff0101aac52197224b69fa2a2dbd`. No issue number was supplied.
Prior notes are preserved in the repository's `RELEASE-NOTES-00.03.03.md`.
