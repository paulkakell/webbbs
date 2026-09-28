import { setTimeout as delay } from 'node:timers/promises';

export class DoorError extends Error {}
export const safeText = (value, limit = 64) => String(value ?? '').replace(/[^\x20-\x7e]/g, '').slice(0, limit);
export function integer(value, min, max) {
  if (!/^\d+$/.test(String(value))) throw new DoorError(`Enter a whole number from ${min} to ${max}.`);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new DoorError(`Enter a whole number from ${min} to ${max}.`);
  return n;
}
export function requireGame(condition, message) {
  if (!condition) throw new DoorError(message);
}
const ids = new Set(['world-conquest', 'lantern-hollow', 'modem-mogul']);
const document = (row, initial) => {
  if (!row) return initial();
  if (row.data?.schema !== 1) throw new DoorError('This save requires another game version. Contact the sysop.');
  return structuredClone(row.data.value);
};

/** Run a complete action atomically. Never accept the acting user ID from a door command. */
export async function executeDoor(prisma, game, user, command, options = {}) {
  requireGame(ids.has(game.id), 'Unknown bundled door.');
  requireGame(typeof user?.id === 'string' && user.id.length <= 128, 'Log in before playing.');
  requireGame(typeof command === 'string' && command.length <= 120 && !/[^\x20-\x7e]/.test(command), 'Use at most 120 printable ASCII characters.');
  const now = options.now ?? Date.now();
  const scope = `u:${user.id}`;
  // Reuse random draws on transaction retries, rather than rerolling a battle.
  const rolls = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    let roll = 0;
    const rng = () => rolls[roll++] ?? (rolls[roll - 1] = (options.rng ?? Math.random)());
    try {
      return await prisma.$transaction(async (tx) => {
        const actor = await tx.user.findUnique({ where: { id: user.id }, select: { id: true, handle: true } });
        requireGame(actor, 'This account is no longer available.');
        const pkg = await tx.doorPackage.findUnique({ where: { doorId: game.id } });
        requireGame(pkg?.enabled, 'The sysop has disabled this door.');
        actor.handle = safeText(actor.handle, 32) || 'Player';
        const key = (s) => ({ doorId_scope: { doorId: game.id, scope: s } });
        const wr = await tx.doorSave.findUnique({ where: key('world') });
        const pr = await tx.doorSave.findUnique({ where: key(scope) });
        const world = document(wr, () => game.world(now));
        const player = document(pr, () => game.player(actor, now));
        player.handle = actor.handle;
        if (!options.system) {
          requireGame(now >= (player.nextInputAt || 0), 'Wait a moment before the next command.');
          player.nextInputAt = now + 350;
        }
        const beforeWorld = JSON.stringify(world);
        const beforePlayer = pr ? JSON.stringify(pr.data.value) : null;
        const peers = game.id === 'lantern-hollow' && ['who', 'look'].includes(command.trim().toLowerCase())
          ? await tx.doorSave.findMany({ where: { doorId: game.id, scope: { startsWith: 'u:' }, updatedAt: { gte: new Date(now - 15000) } }, take: 30 }) : [];
        const lines = game.apply({ world, player, actor, command: command.trim(), now, rng, system: options.system, cursor: options.cursor ?? 0, peers });
        const save = async (s, value, score = 0) => {
          requireGame(Buffer.byteLength(JSON.stringify(value)) <= 131072, 'Save capacity reached. Contact the sysop.');
          const data = { data: { schema: 1, value }, score: Math.max(0, Math.min(2147483647, Math.floor(score))) };
          await tx.doorSave.upsert({ where: key(s), create: { doorId: game.id, scope: s, ...data }, update: data });
        };
        if (!wr || beforeWorld !== JSON.stringify(world)) await save('world', world);
        if (!pr || beforePlayer !== JSON.stringify(player)) await save(scope, player, game.score(player));
        if (command.toLowerCase() === 'scores' && !options.system) {
          const rows = await tx.doorSave.findMany({ where: { doorId: game.id, scope: { startsWith: 'u:' } }, orderBy: [{ score: 'desc' }, { scope: 'asc' }], take: 10 });
          lines.push('HIGH SCORES', ...rows.map((r, i) => `${i + 1}. ${safeText(r.data?.value?.handle, 32)}: ${r.score}`));
        }
        return { lines, cursor: world.seq ?? 0 };
      }, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 });
    } catch (error) {
      if (!['P2034', 'P2002'].includes(error.code) || attempt === 3) throw error;
      await delay(5 * 3 ** attempt);
    }
  }
}
