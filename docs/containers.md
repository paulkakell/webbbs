---
title: Container installation
permalink: /containers/
---

# Container installation

[Home]({{ '/' | relative_url }}) | [Games]({{ '/bundled-doors/' | relative_url }}) | [Release and rollback]({{ '/release-notes/' | relative_url }})

## Install the prebuilt image

The current source release is 00.04.00. Use the image only after its GHCR workflow
succeeds. The supported published platform remains Linux amd64. A successful
source release or Pages deployment is not proof that an image was published.

Download `docker-compose.ghcr.yml` and `.env.ghcr.example` from the matching GitHub
release or tagged source tree. The standalone file does not require a Dockerfile:

```sh
cp .env.ghcr.example .env
chmod 600 .env
openssl rand -hex 24
openssl rand -hex 24
# Put two DIFFERENT generated values into POSTGRES_PASSWORD and SYSOP_PASSWORD.
docker compose -f docker-compose.ghcr.yml config --quiet
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

Open `http://localhost:3000/bbs` for the terminal and `/admin` for administration.
New installations use handle `sysop` unless configured otherwise. Existing user
credentials are not reset by editing bootstrap environment settings.

## Settings and examples

| Variable | Default or requirement | Example/use |
| --- | --- | --- |
| `WEBBBS_IMAGE` | `ghcr.io/paulkakell/webbbs:00.04.00` | Pin the verified digest for repeatable deployment or rollback. |
| `POSTGRES_PASSWORD` | Required, no fallback | Set before first startup; retain an existing database's password on upgrades. |
| `SYSOP_HANDLE` | `sysop` | Set `SYSOP_HANDLE=operator` before first bootstrap for a different handle. |
| `SYSOP_PASSWORD` | Required, no fallback | Use a separate strong password, not the database password. |
| `PORT` | Host port `3000` | `PORT=3001` publishes host 3001; the app still listens on container port 3000. |
| `BIND_ADDRESS` | `127.0.0.1` | `0.0.0.0` exposes the host port to other machines; add firewall and HTTPS protection. |
| `DB_VOLUME` | `./.data/postgres` | Point to the EXISTING PostgreSQL directory, such as `/dockershare/containers/webbbs/db`. |
| `APP_VOLUME` | `./.data/files` | Point to the existing file directory, such as `/dockershare/containers/webbbs/app`. |
| `SESSION_TTL_DAYS` | `7` | Set `1` for shorter newly created web sessions. |
| `ALLOW_REGISTRATION` | `true` | `false` controls initial bootstrap; use Admin for existing stored configuration. |

The standalone Compose file sets `DATABASE_URL` internally using the database
service and credentials, `DATA_DIR=/data`, and container `PORT=3000`. There are no
new door-specific environment variables. Disable or enable games through the
existing Admin Doors controls. Saved progress lives in PostgreSQL, not APP_VOLUME.

Generated hexadecimal passwords avoid connection-URL escaping pitfalls. When
using other characters in the database password, the password inside a manually
constructed DATABASE_URL must be URL-encoded; shell or YAML quoting alone does
not perform URL encoding. Never publish `.env`, rendered secret-bearing Compose
configuration, database backups, or registry credentials. Use `config --quiet`
when checking configuration in shared logs.

## Existing installations

Back up PostgreSQL, preserve volume paths, and record the running image ID/digest.
Do not replace existing credentials, host ports, or custom Docker network settings
with example defaults. Editing `POSTGRES_PASSWORD` does not update the credentials
inside an already initialized database. A changed bind path can look like a new,
empty installation even when the original data remains elsewhere.

Change the image reference in your current Compose/environment configuration and
recreate the application after the new release is published. The three new doors
are scanned and installed automatically. Rescans preserve disabled settings.
Read the [release notes]({{ '/release-notes/' | relative_url }}) before upgrading:
00.04.00 adds DoorSave, and downgrading requires its documented archival step.
Do not delete volumes or add a data-loss override to work around a schema warning.

## Registry access

GHCR package visibility is separate from publication. For a private package,
authorized users must log in with a token that has `read:packages` and any required
organization authorization. Avoid putting tokens in command arguments or files:

```sh
# Read a token securely using your shell's normal secret-entry mechanism.
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin
unset GHCR_TOKEN
```

Owners can make the package public for anonymous pulls. Verify the version tag and
revision label against the release commit. Retain the previously running local
image or save it with `docker image save` before upgrading; source tags alone are
not usable image backups.

## Source builds and reverse proxies

`docker-compose.yml` still uses `build: .`. Clone the full repository before
running that file. A Compose-only download cannot build without a Dockerfile.
See the repository README for source setup. Source builds use unlocked dependency
ranges; a verified image digest is a stronger deployment reference.

The BBS terminal requires a WebSocket upgrade at `/ws/bbs`. Successful upgrades
return HTTP 101; plain HTTP requests intentionally return 426. Forward the Upgrade
and Connection headers and use HTTP/1.1 for the upstream. The application retains
the 00.03.03 startup-order fix. Use HTTPS/WSS and appropriate network restrictions
when making the BBS publicly accessible.

## Validation and troubleshooting

```sh
docker compose -f docker-compose.ghcr.yml ps
docker compose -f docker-compose.ghcr.yml logs --tail 100 webbbs_app
```

Review logs privately; do not share credentials. Missing-image errors require
checking release publication and package visibility. Startup database errors
require checking service readiness, existing credentials, and preserved volumes.
A successful source release does not override a failed blocking dependency audit.
Do not run the destructive integration scripts against a production BBS.
