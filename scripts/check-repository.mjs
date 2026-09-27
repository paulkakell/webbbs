import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(path, 'utf8');
const version = read('VERSION').trim();
assert.match(version, /^\d{2}\.\d{2}\.\d{2}$/);
assert.equal(JSON.parse(read('package.json')).version, version.split('.').map(Number).join('.'));
assert.ok(read('README.md').includes(`## Version ${version}`));
assert.ok(read('CHANGELOG.md').includes(`## ${version}`));
assert.ok(read('docs/_config.yml').includes(`release_version: '${version}'`));
assert.ok(read('docs/release-notes.md').includes(`# Release ${version}`));
assert.ok(!existsSync('docs/.nojekyll'));
let checked = 0;
function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'vendor', '.git', '_site'].includes(entry.name)) continue;
    const file = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walk(file);
    else if (['.js', '.mjs'].includes(extname(file))) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr || `Syntax check failed: ${file}`);
      checked++;
    }
  }
}
for (const directory of ['src', 'scripts', 'test', 'doors', 'public']) walk(directory);
for (const entry of readdirSync('.github/workflows')) {
  if (!/\.ya?ml$/.test(entry)) continue;
  const content = read(`.github/workflows/${entry}`);
  assert.ok(!content.includes('pull_request_target:'), `${entry}: unsafe trigger`);
  for (const match of content.matchAll(/\buses:\s*([^\s#]+)/g)) {
    assert.match(match[1], /^[\w.-]+\/[\w./-]+@[a-f\d]{40}$/, `${entry}: action must use a full commit SHA`);
  }
}
console.log(JSON.stringify({ check: 'repository', status: 'passed', version, javascriptFiles: checked }));
