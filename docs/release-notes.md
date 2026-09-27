---
title: Release notes
permalink: /release-notes/
---

# Release 00.03.01

Date: September 27, 2026. Classification: additive deployment feature and container maintenance fixes.

## Container publication

The prior source release `00.03.00` exists, but its image was not published.
Run `36356970007` stopped at the blocking dependency audit. This patch retains
that check, updates the two affected dependencies, and adds static-file guard
regression checks. No existing tag is moved.

Publish `ghcr.io/paulkakell/webbbs:00.03.01` for `linux/amd64`, together with
`sha-<full-commit>` and `latest` tags. The GHCR workflow validates, builds, audits,
and integration-tests before pushing, then pulls the image and records its
content digest. GitHub's initial package visibility is private; public access
requires the package owner to change package visibility. A successful source
release does not alone prove the separate container workflow passed.

The [GHCR deployment guide]({{ '/containers/' | relative_url }}) explains
installation using only Compose and an environment file, configuration,
authentication, upgrades, and rollback. The original source-build Compose
entry point is unchanged. New standalone deployments require explicit database
and sysop passwords and bind to loopback unless configured otherwise.

## Changes and compatibility

The image uses Node 22 LTS instead of Node 20. The static-file plugin moves to `^10.1.5` and UUID to `^11.1.1` to resolve
the two npm audit findings that blocked the `00.03.00` image. Fastify remains
on 5.x; API endpoints, database schema, and existing configuration names are unchanged.
No migration script or schema change is introduced. Existing volumes and
credentials must be preserved when switching deployment files. Startup still
runs Prisma `db push`, so backups remain necessary before upgrades.

Eight deployment regression tests cover version consistency, credential
requirements, storage compatibility, publication gates, credential handling,
secret exclusions, and integration-check coverage. Disposable-stack checks
exercise PostgreSQL startup, sysop login, invalid requests, unauthorized access,
board writes, session revocation, and WebSocket upgrades. A 20-request timing
measurement is a smoke check, not a capacity claim. Existing CodeQL and Pages
checks continue to run. npm audit includes every shipped dependency and blocks
GHCR publication on findings; it is not an operating-system vulnerability scan.

Consult the release commit's Actions runs for actual results. There is still
no committed npm lockfile and source rebuilds may resolve different versions.
Use image digests for reproducible deployment. Root-user execution and the
existing compiler toolchain remain in the image; no complete container
hardening claim is made. Authentication and logging code are unchanged.

## Rollback

Record the current image digest and back up PostgreSQL plus uploads before an
upgrade. Restore the prior digest in `WEBBBS_IMAGE`, then run:

```sh
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

Preserve volume paths and database credentials; do not delete production
volumes. This is the first GHCR release, so there is no older GHCR image to
assume exists. The prior source release `v00.02.00`, at baseline
`66ed37f90d1442b8882723fbba05176b3b6e47f9`, remains the initial rollback path
using its original Dockerfile and Compose configuration. Later rollback can use
retained GHCR digests. Image rollback cannot reverse a future schema migration.

[Previous release notes](https://github.com/paulkakell/webbbs/blob/v00.02.00/docs/release-notes.md)
remain available with that source tag. No issue number was supplied for this request.

## Commit notes

```text
fix(security): unblock GHCR publication for webBBS 00.03.01

Add versioned Linux amd64 images and a standalone image-only Compose deployment.
Gate publication on tests, syntax/config checks, npm audit, and PostgreSQL smoke tests.
Record image revision and digest; keep source-build compatibility and prior tags.
Use Node 22, require deployment passwords, and exclude secrets from build context.
Update version metadata, changelog, installation guide, and rollback notes.
Patch vulnerable static-file and UUID dependencies; preserve application APIs and database schema.
```
