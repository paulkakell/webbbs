import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { game as war } from '../doors/world-conquest/game.mjs';
import { game as mud } from '../doors/lantern-hollow/game.mjs';
import { game as sim } from '../doors/modem-mogul/game.mjs';
import { DoorError, executeDoor, integer, safeText } from '../src/lib/door-store.mjs';
import { createNativeDoor } from '../src/lib/native-door.mjs';

const a = { id: 'alice', handle: 'Alice' }, b = { id: 'bob', handle: 'Bob' };
const time = Date.UTC(2026, 8, 27, 12);
function fixture(game, actor = a, world = game.world(time)) {
  return { game, world, player: game.player(actor, time), actor, now: time, rng: () => 0.5, cursor: 0 };
}
function act(f, command, options = {}) {
  const state = structuredClone({ world: f.world, player: f.player });
  const lines = f.game.apply({ ...f, ...state, command, ...options });
  Object.assign(f, state);
  f.now += 1000;
  f.cursor = f.world.seq ?? 0;
  return lines;
}
export function fakeDb() {
  const db = { rows: new Map(), users: new Map([[a.id, a], [b.id, b]]), enabled: true, conflicts: 0, transactions: 0 };
  db.$transaction = async (fn, options) => {
    assert.equal(options.isolationLevel, 'Serializable');
    db.transactions++;
    const rows = structuredClone(db.rows);
    const key = q => `${q.doorId_scope.doorId}/${q.doorId_scope.scope}`;
    const tx = {
      user: { findUnique: async q => structuredClone(db.users.get(q.where.id) ?? null) },
      doorPackage: { findUnique: async () => ({ enabled: db.enabled }) },
      doorSave: {
        findUnique: async q => structuredClone(rows.get(key(q.where)) ?? null),
        upsert: async q => {
          const k = key(q.where), old = rows.get(k);
          const row = { ...(old ?? q.create), ...(old ? q.update : {}), updatedAt: new Date() };
          rows.set(k, structuredClone(row)); return row;
        },
        findMany: async q => [...rows.values()].filter(r => r.doorId === q.where.doorId && r.scope.startsWith(q.where.scope.startsWith)).sort((x, y) => y.score - x.score).slice(0, q.take)
      }
    };
    const result = await fn(tx);
    if (db.conflicts-- > 0) throw Object.assign(new Error('conflict'), { code: 'P2034' });
    db.rows = rows; return result;
  };
  return db;
}

for (const game of [war, mud, sim]) {
  test(`${game.name}: bundled enabled manifest and loader contract`, async () => {
    const manifest = JSON.parse(readFileSync(new URL(`../doors/${game.id}/manifest.json`, import.meta.url)));
    const { door } = await import(`../doors/${game.id}/door.mjs`);
    assert.equal(manifest.enabled, true);
    for (const field of ['doorId', 'name', 'description', 'type']) assert.equal(manifest[field], door[field]);
    assert.equal(typeof (await door.createModule()).enter, 'function');
  });
  test(`${game.name}: help, status and unknown command`, () => {
    const f = fixture(game);
    assert.ok(act(f, 'help').length >= 5);
    assert.ok(act(f, 'look').length);
    assert.throws(() => act(f, 'invalid-command'), DoorError);
  });
}

test('World Conquest: private CPU campaign does not occupy shared lobby', () => {
  const f = fixture(war); act(f, 'solo');
  assert.equal(f.world.members.length, 0);
  assert.equal(f.player.campaign.lands.length, 12);
  const initial = structuredClone(f.player.campaign);
  act(f, 'lobby'); act(f, 'solo');
  assert.deepEqual(f.player.campaign, initial);
});
test('World Conquest: host, seat and turn authorization', () => {
  const f = fixture(war); act(f, 'join');
  assert.throws(() => act(f, 'join'), DoorError);
  assert.throws(() => act(f, 'start'), DoorError);
  const other = fixture(war, b, f.world); act(other, 'join');
  assert.throws(() => act(other, 'start'), /host/);
  f.world = other.world; act(f, 'start');
  other.world = f.world;
  assert.throws(() => act(other, 'end'), /turn/);
  assert.throws(() => act(f, 'reinforce 2 1'), /own/);
  assert.throws(() => act(f, 'attack 1 2'), /reserves/);
  assert.throws(() => act(f, 'claim'), /expired/);
  act(f, 'claim', { now: f.world.deadline + 1 });
  assert.equal(f.world.members[f.world.turn].id, b.id);
});
test('World Conquest: strict troop parsing, adjacency and fortification', () => {
  const f = fixture(war); act(f, 'solo');
  for (const invalid of ['-1', '1x', '0', '1.5', '999999999999999999999']) assert.throws(() => act(f, `reinforce 1 ${invalid}`), DoorError);
  act(f, 'reinforce 1 3');
  assert.throws(() => act(f, 'attack 1 12'), /edge/);
  assert.throws(() => act(f, 'attack 1 5'), /enemy/);
  act(f, 'fortify 1 5 2');
  assert.throws(() => act(f, 'fortify 5 9 1'), /once/);
});
test('World Conquest: defender wins ties; decisive capture records one victory', () => {
  const f = fixture(war); act(f, 'solo');
  act(f, 'reinforce 1 3');
  const m = f.player.campaign;
  m.lands.forEach(t => { t.owner = a.id; t.troops = 3; });
  m.lands[1].owner = 'cpu'; m.lands[1].troops = 1;
  act(f, 'attack 1 2', { rng: () => 0 });
  assert.equal(f.player.campaign.lands[0].troops, 2);
  let roll = 0;
  act(f, 'attack 1 2', { rng: () => roll++ === 0 ? 0.99 : 0 });
  assert.equal(f.player.campaign.phase, 'finished');
  assert.equal(f.player.wins, 1);
  act(f, 'look'); assert.equal(f.player.wins, 1);
  assert.throws(() => act(f, 'attack 1 2'), /Start/);
});
test('World Conquest: CPU turns finish and armies stay positive', () => {
  const f = fixture(war); act(f, 'solo');
  for (let i = 0; i < 100 && f.player.campaign.phase === 'playing'; i++) {
    act(f, 'end');
    assert.ok(f.player.campaign.lands.every(t => Number.isSafeInteger(t.troops) && t.troops > 0));
    if (f.player.campaign.phase === 'playing') assert.equal(f.player.campaign.turn, 0);
  }
});

test('Lantern Hollow: shared enemies, timed combat and one reward', () => {
  const first = fixture(mud); act(first, 'north'); act(first, 'attack', { rng: () => 0 });
  assert.equal(first.world.foes[1].hp, 9);
  const second = fixture(mud, b, first.world); act(second, 'north'); act(second, 'attack', { rng: () => 0 });
  assert.equal(second.world.foes[1].hp, 6);
  first.world = second.world;
  act(first, '', { system: 'tick', now: time + 5000, rng: () => 0 });
  second.world = first.world;
  act(second, '', { system: 'tick', now: time + 5000, rng: () => 0 });
  assert.equal(second.world.foes[1].hp, 0);
  assert.equal(second.player.totalXp, 13);
  assert.equal(first.player.totalXp, 0);
  act(second, '', { system: 'tick', now: time + 6000 });
  assert.equal(second.world.foes[1].hp, 0);
  act(second, 'look', { now: time + 35001 });
  assert.equal(second.world.foes[1].hp, 12);
  assert.equal(second.player.totalXp, 13);
});
test('Lantern Hollow: death, retreat, resting and purchases', () => {
  const f = fixture(mud); f.player.room = 8; f.player.hp = 1;
  act(f, 'attack', { rng: () => 0 });
  assert.equal(f.player.room, 0); assert.equal(f.player.gold, 24); assert.equal(f.player.hp, 15);
  act(f, 'rest'); assert.equal(f.player.hp, 30);
  act(f, 'buy potion'); assert.equal(f.player.gold, 9);
  assert.throws(() => act(f, 'buy sword'), /gold/);
  act(f, 'east'); assert.throws(() => act(f, 'rest'), /Square/);
  act(f, 'attack'); act(f, 'west'); assert.equal(f.player.fighting, false);
});
test('Lantern Hollow: idle combat, reconnect and bounded room chat', () => {
  const f = fixture(mud); act(f, 'north'); act(f, 'attack');
  const hp = f.world.foes[1].hp;
  act(f, '', { system: 'tick', now: time + 200000 });
  assert.equal(f.player.fighting, false); assert.equal(f.player.present, false);
  assert.equal(f.world.foes[1].hp, hp);
  act(f, 'look', { system: 'enter' }); assert.equal(f.player.present, true);
  for (let i = 0; i < 100; i++) act(f, `say Message ${i}`);
  assert.equal(f.world.events.length, 40);
  assert.throws(() => act(f, 'say ' + 'x'.repeat(91)), DoorError);
  act(f, '', { system: 'leave' }); assert.equal(f.player.present, false);
});
test('Lantern Hollow: quest and maximum item/level limits', () => {
  const f = fixture(mud); f.player.room = 8; f.world.foes[8].hp = 1;
  f.player.level = 19; f.player.xp = 474;
  act(f, 'attack'); assert.equal(f.player.level, 20); assert.equal(f.player.questDone, true);
  f.player.room = 0; f.player.potions = 20;
  assert.throws(() => act(f, 'buy potion'), /limit/);
});

test('Modem Mogul: economy, equipment, names and daily budget', () => {
  const f = fixture(sim); act(f, 'name The Copper Line');
  act(f, 'buy modem'); act(f, 'buy disk'); act(f, 'buy files');
  assert.equal(f.player.cash, 160); assert.equal(f.player.name, 'The Copper Line');
  for (let i = 0; i < 10; i++) act(f, 'next');
  assert.equal(f.player.turns, 0); assert.throws(() => act(f, 'next'), /refill/);
  act(f, 'look', { now: time - 86400000 }); assert.equal(f.player.turns, 0);
  act(f, 'look', { now: time + 86400000 }); assert.equal(f.player.turns, 10);
});
test('Modem Mogul: capacity, closure and restart cannot refill daily turns', () => {
  const f = fixture(sim); f.player.files = 50;
  assert.throws(() => act(f, 'buy files'), /storage/);
  f.player.staff = 20; f.player.cash = 0;
  act(f, 'next'); assert.equal(f.player.closed, true); assert.equal(f.player.cash, 0);
  const turns = f.player.turns;
  assert.throws(() => act(f, 'buy modem'), /closed/);
  act(f, 'restart confirm'); assert.equal(f.player.turns, turns); assert.equal(f.player.cash, 500);
  assert.throws(() => act(f, 'restart confirm'), DoorError);
});
test('Modem Mogul: success milestone and safe economic caps', () => {
  const f = fixture(sim); f.player.users = 999; f.player.modems = 100; f.player.cash = 100000000;
  act(f, 'next', { rng: () => 0.99 });
  assert.equal(f.player.achieved, true); assert.ok(f.player.cash <= 100000000);
  assert.throws(() => act(f, 'buy modem'), /limit/);
});

test('Store: authentication, disabled doors, input validation and terminal sanitization', async () => {
  const db = fakeDb();
  await assert.rejects(executeDoor(db, sim, null, 'look'), /Log in/);
  await assert.rejects(executeDoor(db, sim, { id: 'missing' }, 'look'), /account/);
  db.enabled = false; await assert.rejects(executeDoor(db, sim, a, 'look'), /disabled/);
  db.enabled = true;
  for (const input of ['\x1b[2J', '\u009b2J', 'x'.repeat(121)]) await assert.rejects(executeDoor(db, sim, a, input), /ASCII/);
  assert.equal(safeText('A\x1b\n\u009bB'), 'AB');
  assert.throws(() => integer('1e3', 1, 2000), DoorError);
  assert.equal(db.rows.size, 0);
});
test('Store: durable reconnect, player isolation, leaderboard and flood protection', async () => {
  const db = fakeDb();
  await executeDoor(db, sim, a, 'buy modem', { now: time });
  await executeDoor(db, sim, b, 'look', { now: time });
  const output = await executeDoor(db, sim, a, 'look', { now: time + 1000 });
  assert.ok(output.lines.some(x => x.includes('Modems 2')));
  assert.equal(db.rows.get('modem-mogul/u:bob').data.value.modems, 1);
  await assert.rejects(executeDoor(db, sim, a, 'buy modem', { now: time + 1001 }), /moment/);
  const scores = await executeDoor(db, sim, a, 'scores', { now: time + 2000 });
  assert.ok(scores.lines.includes('HIGH SCORES'));
});
test('Store: retries replay the same randomness and failed actions never save', async () => {
  const db = fakeDb(); db.conflicts = 2; let rolls = 0;
  await executeDoor(db, sim, a, 'next', { now: time, rng: () => { rolls++; return 0.5; } });
  assert.equal(rolls, 1); assert.equal(db.transactions, 3);
  const before = structuredClone(db.rows);
  await assert.rejects(executeDoor(db, sim, a, 'buy bogus', { now: time + 1000 }), DoorError);
  assert.deepEqual(db.rows, before);
});
test('Store: unknown schema is retained, not overwritten', async () => {
  const db = fakeDb(); await executeDoor(db, sim, a, 'look', { now: time });
  db.rows.get('modem-mogul/u:alice').data.schema = 99;
  await assert.rejects(executeDoor(db, sim, a, 'look', { now: time + 1000 }), /version/);
  assert.equal(db.rows.get('modem-mogul/u:alice').data.schema, 99);
});
test('Runtime: prompt, save, exit callback and safe storage failure message', async () => {
  const door = createNativeDoor(sim), db = fakeDb(); let exited = false; let output = '';
  const mod = await door.createModule({ onExit: async () => { exited = true; } });
  const session = { prisma: db, user: a, alive: true, currentModule: mod, clear() {}, setMode() {}, writeAnsi(text) { output += text; } };
  await mod.enter(session); assert.match(output, /Modem Mogul>/);
  db.enabled = false; await mod.onLine(session, 'next'); assert.match(output, /disabled/);
  await mod.onLine(session, 'q'); assert.equal(exited, true);
});
test('Performance: 10,000 simulation actions remain bounded', () => {
  const f = fixture(sim), start = performance.now();
  for (let i = 0; i < 10000; i++) {
    f.player.turns = 10;
    act(f, 'next');
  }
  assert.ok(JSON.stringify(f.player).length < 4096);
  const elapsed = performance.now() - start;
  console.log(JSON.stringify({ check: 'door-engine-performance', actions: 10000, milliseconds: Math.round(elapsed) }));
  assert.ok(elapsed < 10000, '10,000 in-memory actions must finish within 10 seconds');
});

test('Runtime: real-time tick persists damage and timer stops after departure', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const db = fakeDb();
  const mod = await createNativeDoor(mud).createModule();
  const session = { prisma: db, user: a, alive: true, currentModule: mod, clear() {}, setMode() {}, writeAnsi() {} };
  await mod.enter(session);
  const value = db.rows.get('lantern-hollow/u:alice').data.value;
  Object.assign(value, { room: 1, fighting: true, fightUntil: Date.now() + 60000, nextAttack: 0 });
  t.mock.timers.tick(3000);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(db.rows.get('lantern-hollow/world').data.value.foes[1].hp < 12);
  const calls = db.transactions;
  session.alive = false;
  t.mock.timers.tick(3000);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(db.transactions, calls);
  t.mock.timers.tick(30000);
  assert.equal(db.transactions, calls);
});

test('World Conquest: finished solo reset returns safely to the shared lobby', () => {
  const f = fixture(war); act(f, 'solo'); f.player.campaign.phase = 'finished';
  act(f, 'new confirm'); act(f, 'look'); act(f, 'leave');
  assert.equal(f.player.mode, 'shared'); assert.equal(f.player.campaign, null);
});
