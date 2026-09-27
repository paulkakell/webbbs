import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyPages } from '../scripts/verify-pages.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'webbbs-pages-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of ['getting-started', 'security', 'release-notes']) {
    mkdirSync(join(root, name));
    writeFileSync(join(root, name, 'index.html'), '<a href="/webbbs/">Home</a>');
  }
  writeFileSync(join(root, 'index.html'), '<a href="/webbbs/security/">Security</a>');
  writeFileSync(join(root, '404.html'), '<a href="/webbbs/">Home</a>');
  return root;
}

test('Pages validator accepts a complete project-path site', (t) => {
  assert.deepEqual(verifyPages(fixture(t)), { files: 5, html: 5 });
});
test('Pages validator rejects missing pages', (t) => {
  const root = fixture(t);
  rmSync(join(root, '404.html'));
  assert.throws(() => verifyPages(root), /Missing page/);
});
test('Pages validator rejects application and secret files', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, '.env'), 'not-a-secret');
  assert.throws(() => verifyPages(root), /Forbidden/);
  rmSync(join(root, '.env'));
  mkdirSync(join(root, 'src'));
  assert.throws(() => verifyPages(root), /Forbidden/);
});
test('Pages validator rejects symlinks', (t) => {
  const root = fixture(t);
  symlinkSync(join(root, 'index.html'), join(root, 'alias.html'));
  assert.throws(() => verifyPages(root), /Forbidden/);
});
test('Pages validator rejects broken project links', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'index.html'), '<a href="/webbbs/missing/">Missing</a>');
  assert.throws(() => verifyPages(root), /Broken local link/);
});
test('Pages validator rejects root links missing the project baseurl', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'index.html'), '<a href="/security/">Missing prefix</a>');
  assert.throws(() => verifyPages(root), /baseurl/);
});
test('Pages validator rejects relative path traversal', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'index.html'), '<a href="../">Outside</a>');
  assert.throws(() => verifyPages(root), /Broken local link/);
});
test('Pages workflow isolates docs and deploys only from main', () => {
  const workflow = readFileSync('.github/workflows/jekyll-gh-pages.yml', 'utf8');
  assert.match(workflow, /source: \.\/docs/);
  assert.match(workflow, /github\.event_name != 'pull_request'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /npm run pages:verify/);
  assert.doesNotMatch(workflow, /pull_request_target/);
});
