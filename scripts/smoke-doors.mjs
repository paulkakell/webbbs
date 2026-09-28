// Destructive integration checks: only against an empty disposable game database.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { executeDoor } from '../src/lib/door-store.mjs';
import { game as war } from '../doors/world-conquest/game.mjs';
import { game as mud } from '../doors/lantern-hollow/game.mjs';
import { game as sim } from '../doors/modem-mogul/game.mjs';

assert.equal(process.env.WEBBBS_DOOR_INTEGRATION, '1', 'Set WEBBBS_DOOR_INTEGRATION=1 only for a disposable stack.');
const prisma = new PrismaClient();
const sql = new pg.Client({ connectionString: process.env.DATABASE_URL });
const ids = [war.id, mud.id, sim.id];
const actors = [];
let adminCookie;
const base = 'http://127.0.0.1:3000';
const temp = mkdtempSync(join(tmpdir(), 'webbbs-doors-'));
const readSave = (game, scope) => prisma.doorSave.findUniqueOrThrow({ where: { doorId_scope: { doorId: game.id, scope } } });
try {
  await sql.connect();
  assert.equal(await prisma.doorSave.count(), 0, 'Refusing to touch existing game saves.');
  for (const game of [war, mud, sim]) {
    const pkg = await prisma.doorPackage.findUniqueOrThrow({ where: { doorId: game.id } });
    assert.equal(pkg.enabled, true, `${game.id} is enabled on first startup`);
    assert.equal(pkg.type, 'INTERNAL');
  }
  const passwordHash = await bcrypt.hash(randomUUID(), 10);
  for (let i = 0; i < 2; i++) actors.push(await prisma.user.create({ data: { handle: `door-ci-${randomUUID()}`, passwordHash } }));
  const [a, b] = actors, now = Date.now();
  for (const game of [war, mud, sim]) {
    for (const actor of actors) await executeDoor(prisma, game, actor, 'look', { now, system: 'enter' });
  }
  const spending = await Promise.allSettled([
    executeDoor(prisma, sim, a, 'buy modem', { now: now + 1000 }),
    executeDoor(prisma, sim, a, 'buy modem', { now: now + 1000 })
  ]);
  assert.equal(spending.filter(r => r.status === 'fulfilled').length, 1);
  const company = (await readSave(sim, `u:${a.id}`)).data.value;
  assert.equal(company.cash, 300); assert.equal(company.modems, 2);
  const secondClient = new PrismaClient();
  try {
    const persisted = await secondClient.doorSave.findUniqueOrThrow({ where: { doorId_scope: { doorId: sim.id, scope: `u:${a.id}` } } });
    assert.equal(persisted.data.value.modems, 2);
  } finally { await secondClient.$disconnect(); }
  for (const actor of actors) await executeDoor(prisma, mud, actor, 'north', { now: now + 2000 });
  await Promise.all(actors.map(actor => executeDoor(prisma, mud, actor, 'attack', { now: now + 3000, rng: () => 0 })));
  assert.equal((await readSave(mud, 'world')).data.value.foes[1].hp, 6);
  await Promise.all(actors.map(actor => executeDoor(prisma, war, actor, 'join', { now: now + 4000 })));
  const lobby = (await readSave(war, 'world')).data.value;
  assert.equal(lobby.members.length, 2);
  const host = actors.find(actor => actor.id === lobby.members[0].id);
  const guest = actors.find(actor => actor.id !== host.id);
  await executeDoor(prisma, war, host, 'start', { now: now + 5000 });
  await assert.rejects(executeDoor(prisma, war, guest, 'end', { now: now + 6000 }), /turn/);
  await assert.rejects(executeDoor(prisma, sim, { id: randomUUID() }, 'look'), /account/);
  await prisma.doorPackage.update({ where: { doorId: sim.id }, data: { enabled: false } });
  await assert.rejects(executeDoor(prisma, sim, a, 'next', { now: now + 7000 }), /disabled/);
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: process.env.SYSOP_HANDLE || 'sysop', password: process.env.SYSOP_PASSWORD }) });
  assert.equal(login.status, 200); adminCookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(adminCookie);
  const rescan = await fetch(`${base}/api/admin/doors/rescan`, { method: 'POST', headers: { cookie: adminCookie } });
  assert.equal(rescan.status, 200);
  assert.equal((await prisma.doorPackage.findUniqueOrThrow({ where: { doorId: sim.id } })).enabled, false, 'Rescan preserves disabled settings');
  await prisma.doorPackage.update({ where: { doorId: sim.id }, data: { enabled: true } });
  const timings = [];
  for (let i = 0; i < 50; i++) {
    const start = performance.now();
    await executeDoor(prisma, sim, a, 'look', { now: now + 10000 + i * 1000 });
    timings.push(performance.now() - start);
  }
  timings.sort((x, y) => x - y);
  const snapshot = async () => (await sql.query('SELECT row_to_json(t) AS row FROM public."DoorSave" t ORDER BY "doorId", "scope"')).rows;
  const before = await snapshot();
  await sql.query(readFileSync('ops/00.04.00-up.sql', 'utf8'));
  await sql.query(readFileSync('ops/00.04.00-up.sql', 'utf8'));
  assert.deepEqual(await snapshot(), before, 'Explicit upgrade is idempotent');
  await sql.query(readFileSync('ops/00.04.00-rollback.sql', 'utf8'));
  assert.equal((await sql.query('SELECT to_regclass(\'public."DoorSave"\') AS name')).rows[0].name, null);
  // Exercise the old model set with the real CLI, without any data-loss override.
  const schema = readFileSync('prisma/schema.prisma', 'utf8').replace(/\/\/ Additive game storage\.[\s\S]*$/, '');
  const legacy = join(temp, 'legacy.prisma'); writeFileSync(legacy, schema);
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate', '--schema', legacy], { stdio: 'pipe', timeout: 60000 });
  await sql.query(readFileSync('ops/00.04.00-restore.sql', 'utf8'));
  assert.deepEqual(await snapshot(), before, 'Rollback and restore preserve every save');
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'], { stdio: 'pipe', timeout: 60000 });
  console.log(JSON.stringify({ check: 'door-integration', status: 'passed', games: 3, atomicPurchases: true, sharedCombat: true, rollbackPreservedSaves: before.length, databaseActions: timings.length, medianMs: Number(timings[25].toFixed(2)), p95Ms: Number(timings[47].toFixed(2)) }));
} finally {
  if (adminCookie) await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie: adminCookie } }).catch(() => {});
  if (actors.length) {
    await prisma.doorSave.deleteMany({ where: { doorId: { in: ids }, scope: { in: ['world', ...actors.map(a => `u:${a.id}`)] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: actors.map(a => a.id) } } }).catch(() => {});
    await prisma.doorPackage.updateMany({ where: { doorId: { in: ids } }, data: { enabled: true } }).catch(() => {});
  }
  rmSync(temp, { recursive: true, force: true });
  await sql.end().catch(() => {}); await prisma.$disconnect();
}
