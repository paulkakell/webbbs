import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
const version = read('VERSION').trim();
const compose = read('docker-compose.ghcr.yml');
const workflow = read('.github/workflows/ghcr.yml');

test('GHCR deployment uses the release version without a local build', () => {
  assert.match(version, /^\d{2}\.\d{2}\.\d{2}$/);
  assert.ok(compose.includes(`ghcr.io/paulkakell/webbbs:${version}`));
  assert.ok(read('.env.ghcr.example').includes(`ghcr.io/paulkakell/webbbs:${version}`));
  assert.doesNotMatch(compose, /^\s*build:/m);
});
test('standalone Compose requires credentials and defaults to loopback', () => {
  assert.match(compose, /\$\{POSTGRES_PASSWORD:\?/);
  assert.match(compose, /\$\{SYSOP_PASSWORD:\?/);
  assert.match(compose, /\$\{BIND_ADDRESS:-127\.0\.0\.1\}/);
  assert.doesNotMatch(compose, /SYSOP_PASSWORD.*:-/);
});
test('deployment preserves service names, storage overrides, and readiness', () => {
  for (const text of ['container_name: webbbs_db', 'container_name: webbbs_app',
    'DB_VOLUME:-./.data/postgres', 'APP_VOLUME:-./.data/files', 'condition: service_healthy'])
    assert.ok(compose.includes(text));
});
test('publication follows validation, smoke tests, and a blocking dependency audit', () => {
  assert.match(workflow, /needs: validate/);
  assert.match(workflow, /github\.event_name != 'pull_request'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /audit --audit-level=low/);
  assert.doesNotMatch(workflow, /continue-on-error: true|pull_request_target/);
  assert.ok(workflow.indexOf('scripts/smoke-container.mjs') < workflow.indexOf('id: publish'));
});
test('publishing uses scoped credentials and records the digest', () => {
  assert.match(workflow, /packages: write/);
  assert.match(workflow, /--password-stdin/);
  assert.match(workflow, /docker logout ghcr\.io/);
  assert.match(workflow, /Existing version belongs to a different commit/);
  assert.match(workflow, /Verified published image/);
});
test('the container uses Node 22 and excludes common private material', () => {
  assert.match(read('Dockerfile'), /^FROM node:22-bookworm-slim/m);
  const ignored = new Set(read('.dockerignore').trim().split('\n'));
  for (const path of ['.git', '.env', '.env.*', '.data', 'data', '*.pem', '*.key']) assert.ok(ignored.has(path));
});
test('integration checks cover sessions, database writes, and WebSocket upgrade', () => {
  const smoke = read('scripts/smoke-container.mjs');
  for (const text of ['401', '400', 'HttpOnly', '/api/admin/boards', '/api/auth/logout', 'new WebSocket'])
    assert.ok(smoke.includes(text));
});
