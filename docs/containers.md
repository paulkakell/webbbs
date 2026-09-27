---
title: Container registry installation
permalink: /containers/
---

# Install from GHCR

[Home]({{ '/' | relative_url }}) · [Release notes]({{ '/release-notes/' | relative_url }})

The image is `ghcr.io/paulkakell/webbbs`. Initial published platform: `linux/amd64`.
ARM-native images are not published by this workflow. Use the source-build
Compose file on other platforms and validate your build there.

## New installation without source code

Download these two files into a new directory. This does not require Git or a Dockerfile:

```sh
mkdir webbbs && cd webbbs
curl -fL https://raw.githubusercontent.com/paulkakell/webbbs/v00.03.01/docker-compose.ghcr.yml -o docker-compose.ghcr.yml
curl -fL https://raw.githubusercontent.com/paulkakell/webbbs/v00.03.01/.env.ghcr.example -o .env
chmod 600 .env
openssl rand -hex 24
openssl rand -hex 24
```

Edit `.env`: use the two generated values for `POSTGRES_PASSWORD` and
`SYSOP_PASSWORD`, respectively. Empty passwords deliberately stop Compose.
Use hexadecimal database passwords because the same value is interpolated into
a PostgreSQL URL. Do not put secrets in Git, image build arguments, or logs.

```sh
docker compose -f docker-compose.ghcr.yml config --quiet
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
docker compose -f docker-compose.ghcr.yml logs -f webbbs_app
```

Open `http://localhost:3000/bbs` or `http://localhost:3000/admin` after startup.
The database has no published host port. The app binds to loopback by default.
For access from another machine, set `BIND_ADDRESS=0.0.0.0` and apply firewall,
HTTPS, and WebSocket reverse-proxy configuration before internet exposure.
An external reverse-proxy container also needs a reachable address or shared network.

## Package visibility and authentication

GitHub defaults new GHCR packages to private, even when source code is public.
For anonymous installation, open the account's `webbbs` package, choose
**Package settings**, and set **Change visibility** to **Public**. Public
visibility is separate from repository permissions and is not changed by CI.

To pull a private package, authenticate locally with a classic personal access
token having `read:packages`. Enter it at Docker's password prompt; do not put it
in Compose or send it to another person:

```sh
docker login ghcr.io -u YOUR_GITHUB_USERNAME
```

The publishing workflow uses its short-lived `GITHUB_TOKEN` with
`packages: write`, not a stored personal token. See GitHub's
[Container registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Configuration and examples

| Variable | Default / example | Purpose |
| --- | --- | --- |
| `WEBBBS_IMAGE` | `ghcr.io/paulkakell/webbbs:00.03.01` | Fixed release; use an `@sha256:...` reference from the workflow summary for exact bytes. |
| `POSTGRES_PASSWORD` | Required | Existing database password or a new hex password; username/database remain `bbs`. |
| `SYSOP_PASSWORD` | Required | Bootstrap administrator password; changing it is not a guaranteed existing-account password reset. |
| `SYSOP_HANDLE` | `sysop` | Bootstrap account name, for example `paul`. |
| `BIND_ADDRESS` | `127.0.0.1` | Local-only; `0.0.0.0` exposes the port on all host interfaces. |
| `PORT` | `3000` | Host port, for example `8080`; container port stays 3000. |
| `DB_VOLUME` | `./.data/postgres` | Persistent PostgreSQL data; for example `/srv/webbbs/postgres`. |
| `APP_VOLUME` | `./.data/files` | Persistent uploads; for example `/srv/webbbs/files`. |
| `SESSION_TTL_DAYS` | `7` | Web session lifetime; for example `1` for shorter sessions. |
| `ALLOW_REGISTRATION` | `true` | Bootstrap setting; set `false` for closed registration and review persisted settings in Admin. |

The image is published with padded release tags (`00.03.01`), full commit tags
(`sha-<40-character-commit>`), and a moving `latest` alias. Prefer version or
digest references for production. Reusing a version from another commit is
rejected when the existing registry manifest can be read. Digest references,
not tags, provide registry-enforced content identity.

## Existing installation and rollback

Do not replace an existing `.env` blindly. Keep the same absolute `DB_VOLUME`
and `APP_VOLUME` paths, database password, sysop account, and Compose project
name. For the original unmodified Compose database, the existing password is
`bbs`; changing an environment variable does not rotate an initialized database's
password. Rotate it separately before exposing the service. Back up PostgreSQL
and uploads before switching. Stop the old stack without deleting data, then
start the GHCR file from the same project directory. Service/container names
are retained. The original `docker-compose.yml` remains the source-build option.

For subsequent image upgrades, record the old digest, change `WEBBBS_IMAGE`,
then run `pull` and `up -d`. Roll back by restoring the recorded digest and
running the same commands. Never use `down -v` on production data.
Release 00.03.01 does not alter the schema, but startup still runs Prisma
`db push`. Image rollback alone is not a database rollback for future schema changes.
Before the first GHCR release, rollback means using the `v00.02.00` source
release with its original Compose file and the preserved data, not a nonexistent
older GHCR tag.

## Publication and checks

Push a versioned change to `main`, or run **Publish GHCR container** manually
on `main`. Pull requests run validation only and never log in or push images.
The workflow runs the complete checked-in tests, syntax/configuration checks,
a fresh Node 22 image build, and a blocking audit of all shipped npm dependencies.
It starts a disposable PostgreSQL stack and checks login validation, session
revocation, admin authorization, database writes, and WebSocket upgrades.
A 20-request timing check is diagnostic, not a production capacity benchmark.
The tested image is pushed, pulled back, and its digest recorded in the summary.
The Pages/source-release and CodeQL workflows continue independently; a source
release does not by itself prove that container publication succeeded.

The static-file and UUID dependencies were updated for security fixes. There is still no committed
npm lockfile. Rebuilding source is not guaranteed to recreate an earlier image;
preserve published digests. OS-package scanning and full production load testing
are not provided by the npm audit. The image retains the existing root-user
runtime and toolchain; this release is not a complete hardening certification.

Release `00.03.00` was source-only: the dependency audit blocked its container
publication. Use `00.03.01`, not an assumed `00.03.00` GHCR tag.
