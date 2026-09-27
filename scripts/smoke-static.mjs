import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';

// Isolate route-guard regression checks from the application's real data.
const root = await mkdtemp(join(tmpdir(), 'webbbs-static-'));
const app = Fastify({ logger: false });
try {
  await mkdir(join(root, 'protected'));
  await writeFile(join(root, 'public.txt'), 'public fixture');
  await writeFile(join(root, 'protected', 'secret.txt'), 'private fixture');
  app.register(staticPlugin, { root });
  app.get('/protected/secret.txt', (_request, reply) => reply.code(401).send('Denied'));
  await app.ready();
  assert.equal((await app.inject('/public.txt')).statusCode, 200);
  for (const url of ['/protected/secret.txt', '/other/../protected/secret.txt',
    '/other/%2e%2e/protected/secret.txt', '/%70rotected/secret.txt']) {
    const response = await app.inject({ method: 'GET', url });
    assert.ok([401, 403, 404].includes(response.statusCode), `Protected path ${url}`);
    assert.ok(!response.body.includes('private fixture'), `Private content exposed at ${url}`);
  }
  console.log(JSON.stringify({ check: 'static-route-guards', status: 'passed', cases: 4 }));
} finally {
  await app.close();
  await rm(root, { recursive: true, force: true });
}
