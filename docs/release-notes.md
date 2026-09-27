---
title: Release notes
permalink: /release-notes/
---

# Release 00.02.00

Date: September 27, 2026. Classification: additive, with release-metadata fixes.
No breaking application API, CLI, configuration, or database changes.

## Added

A Jekyll documentation site with project overview, Docker setup, site maintenance,
security guidance, and release notes. GitHub Pages publishes only `docs/` and
validates generated links and artifacts before deployment.

Dependabot version-update checks cover npm, GitHub Actions, and Docker. The
Pages workflow runs all checked-in tests, repository configuration checks, a
fresh application image build, and an npm dependency audit. Deployment and
release permissions are confined to separate main-branch jobs.

The security policy and CodeQL workflow from commits
`dc66a42d106c28ee8bfb0276496bdbb301e17af3` and
`212c0a07f6fed3df6740f375250dc66b29f8d5d8` are retained.

## Fixed

Release metadata is synchronized: `VERSION`, README, and Jekyll use `00.02.00`;
`package.json` uses its npm-compatible equivalent, `0.2.0`.
The Pages build no longer copies the application repository root into the site.
The theme head include omits its nonexistent favicon; generated-link validation
remains enforced and includes a regression test for that failure.

## Validation and limitations

Consult the Actions run for the release commit for actual pass/fail results;
this page documents configured checks, not an assertion that a scan found no
vulnerabilities. There were no integration or load-test suites in the baseline.
Application dependency ranges, database schema, authentication, authorization,
and logging code are unchanged. No application load test is required for the
static documentation change. The existing Dockerfile uses dependency ranges
without a committed npm lockfile, so fresh resolutions can change over time.
Dependency audit findings are reported separately and are not automatically fixed.

## Rollback

The pre-change main commit is
`8680fdc292cf1c95658739c74020a41896e4b477`.
To revert all commits in this release, inspect the range from that baseline to
the release tag, then revert the range without rewriting history:

```sh
git revert --no-commit 8680fdc292cf1c95658739c74020a41896e4b477..v00.02.00
git commit -m "revert: roll back 00.02.00 documentation and tooling"
git push origin main
```

Keep existing release tags intact. A full revert also restores the old
root-source Pages workflow; to roll back only content while preserving
isolation, restore the prior desired `docs/` content instead and publish a new
bug-fix version.

No database migration or data rollback is involved. The previous source remains
available in Git history. GitHub Pages does not guarantee indefinite retention
of deployment artifacts; do not rely on Actions artifact retention for backups.
