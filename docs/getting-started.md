---
title: Getting started
permalink: /getting-started/
---

# Getting started

[Home]({{ '/' | relative_url }}) ·
[Security]({{ '/security/' | relative_url }}) ·
[Release notes]({{ '/release-notes/' | relative_url }})

## Deploy the BBS with Docker

Install Docker Engine and the Compose plugin on your own host. Clone the
repository, then create local data directories and a private environment file:

```sh
git clone https://github.com/paulkakell/webbbs.git
cd webbbs
mkdir -p .data/postgres .data/files
cp .env.example .env
printf '\nDB_VOLUME=%s/.data/postgres\nAPP_VOLUME=%s/.data/files\n' "$PWD" "$PWD" >> .env
```

Edit `.env` before starting. Set `SYSOP_PASSWORD` to a unique, strong password,
keep `PORT=3000` unless another port is needed, and review `ALLOW_REGISTRATION`.
The shipped database credentials and administrator defaults are for local
setup, not an internet-facing production deployment. Do not commit `.env`.

```sh
docker compose up --build -d
```

Open `http://localhost:3000/bbs` for the terminal or
`http://localhost:3000/admin` for administration. Startup waits for PostgreSQL,
applies the Prisma schema, and bootstraps the sysop account. Back up persistent
data before upgrading; application startup can update database tables.

For production, configure HTTPS and forward WebSocket upgrade headers through
your reverse proxy. See the [full deployment guide](https://github.com/paulkakell/webbbs#readme).
Only install door plugins you trust: they execute as server-side code.

## Maintain this Jekyll site

Edit Markdown pages under `docs/`. New pages need YAML front matter. For example:

```yaml
---
title: Operator notes
permalink: /operator-notes/
---
```

Use Jekyll's `relative_url` filter for internal links so they work under the
project path. The following example is rendered as literal template source:

{% raw %}
```liquid
[Home]({{ '/' | relative_url }})
```
{% endraw %}

`docs/_config.yml` defines `title`, `description`, `url`, `baseurl`,
`repository`, and `release_version`. Change `url` and `baseurl` together when
moving the site. The current public address uses `/webbbs`. No custom domain,
analytics script, or application credentials are configured.

GitHub Pages uses **GitHub Actions** as its publishing source. The workflow
builds only `docs/`, checks generated links and unexpected files, then deploys
on a push to `main`. Pull requests build and validate without deployment.
Manual runs are available in the Actions tab; only `main` can deploy.

To reproduce the GitHub Pages Jekyll builder locally with Docker, from the
repository root:

```sh
git clone https://github.com/actions/jekyll-build-pages.git /tmp/webbbs-jekyll-builder
git -C /tmp/webbbs-jekyll-builder checkout 44a6e6beabd48582f863aeeb6cb2151cc1716697
docker build -t webbbs-jekyll-builder /tmp/webbbs-jekyll-builder
docker run --rm -v "$PWD:/github/workspace" -w /github/workspace \
  -e GITHUB_WORKSPACE=/github/workspace -e GITHUB_REPOSITORY=paulkakell/webbbs \
  -e GITHUB_API_URL=https://api.github.com \
  -e INPUT_SOURCE=./docs -e INPUT_DESTINATION=./_site \
  -e INPUT_BUILD_REVISION=local -e INPUT_VERBOSE=true \
  -e JEKYLL_ENV=production webbbs-jekyll-builder
npm run pages:verify
```

The action is pinned, but its container base image and preinstalled gem versions
are managed upstream. This is not a fully reproducible dependency lock.

## Checks and releases

`npm test` runs the complete checked-in Node test suite. `npm run check` checks
JavaScript syntax, version consistency, workflow pins, and documentation
configuration. `npm run pages:verify` checks a previously built `_site` directory.

Dependabot checks npm, GitHub Actions, and Docker manifests weekly on Monday at
09:00 UTC, opening at most five version-update pull requests per ecosystem.
These are proposals, not automatic merges. Alerts and security updates are
separate repository settings; this schedule does not delay vulnerability alerts.

Versions use `Release.Feature.Fix` with two digits per component, such as
`00.02.00`. npm stores the equivalent `0.2.0` because semver does not allow leading
zeros. Update `VERSION`, `package.json`, the README, the Jekyll configuration,
the changelog, and release notes together. Successful main-branch build and
Pages deployment create the matching `v00.02.00`-style release tag. An existing
tag is never moved.
