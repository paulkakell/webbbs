# Security policy

## Supported versions

Security fixes are maintained on the latest `main` branch. Older releases, older commits, and forks are not maintained for security fixes; upgrade to the latest version before deploying a fix. When reporting an issue, include the affected release or commit and, where practical, confirm whether the issue is present on current `main`.

## Reporting a vulnerability

Please do not disclose vulnerabilities in public issues, pull requests, discussions, or logs.

Use [GitHub's private vulnerability reporting form](https://github.com/paulkakell/webbbs/security/advisories/new), available from **Security → Advisories → Report a vulnerability** when private vulnerability reporting is enabled.

If the private reporting form is unavailable, open a public issue only to request a private reporting channel. Do not include the vulnerability, a proof of concept, affected private systems, or sensitive data in that issue.

A helpful private report includes:

- The affected release or commit and relevant deployment details.
- The affected component and any prerequisites, such as authentication or administrator access.
- Clear reproduction steps or a minimal proof of concept using a system you own or are authorized to test.
- The potential impact and any suggested mitigation or fix.

Remove passwords, session cookies, access tokens, personal information, and other secrets from reports and attachments.

## Scope and responsible testing

Reports concerning webBBS's server, browser client, authentication and authorization, file transfers, door loading, database interactions, dependencies, or repository workflows are welcome. For a vulnerability isolated to an unrelated third-party project, also use that project's private reporting process.

Only test systems you own or have explicit permission to assess. Avoid accessing other users' data, disrupting services, or performing destructive testing. A publicly accessible webBBS instance is not permission to test it.

## Coordinated disclosure

Maintainers review reports on a best-effort basis. Response and remediation times depend on severity, complexity, and maintainer availability; no response-time guarantee is made.

Please keep technical details private while maintainers investigate and coordinate a fix. Where appropriate, a security advisory will describe affected versions, available fixes or mitigations, and reporter credit with the reporter's consent.
