---
title: Security
permalink: /security/
---

# Security

[Home]({{ '/' | relative_url }}) ·
[Getting started]({{ '/getting-started/' | relative_url }})

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/paulkakell/webbbs/security/advisories/new).
Do not put vulnerability details, proof-of-concept exploits, credentials, or
personal data in a public issue or pull request.

The repository's [security policy](https://github.com/paulkakell/webbbs/blob/main/SECURITY.md)
is the authoritative policy for supported versions, responsible testing, and
coordinated disclosure. Include the affected version or commit and enough
information for maintainers to reproduce the problem on an authorized system.

## Repository protections

CodeQL scans JavaScript and TypeScript with the security-extended query suite
on pushes to `main`, pull requests, a weekly schedule, and manual runs.
Dependabot's version-update configuration covers npm, GitHub Actions, and Docker.
Enabling that configuration alone does not enable Dependabot alerts or security
updates; those are controlled by the repository's security settings.

The Pages workflow checks private reporting through GitHub's metadata endpoint
and attempts a read-only Dependabot-alert status check. A permission error is
reported as unverified, never as enabled or as proof that there are no alerts.
An administrator can independently verify the settings using GitHub CLI:

```sh
gh api repos/paulkakell/webbbs/private-vulnerability-reporting
gh api --include repos/paulkakell/webbbs/vulnerability-alerts
```

The first command should return `{"enabled":true}`. The second returns HTTP 204
when alerts are enabled and the caller has the required administration access.
No scanner guarantees the absence of vulnerabilities.

## Site isolation

Only `docs/` is used as the Jekyll source. The application, database schema,
tests, configuration examples, and local secrets are not part of the published
site. The generated artifact is checked for sensitive paths and broken local
links before deployment. Pull-request builds have no Pages deployment or
identity-token write permissions. Application authentication and authorization
remain unchanged by this documentation release.
