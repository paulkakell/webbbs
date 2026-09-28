import { requireGame, safeText } from '../../src/lib/door-store.mjs';

export const rooms = [
  { name: 'Lantern Square', text: 'Copper lanterns light a market around an old well.', exits: { north: 1, east: 5 } },
  { name: 'Briar Road', text: 'Roots cross the road beneath a dark canopy.', exits: { south: 0, north: 2 }, foe: 'Briar imp', hp: 12, power: 3 },
  { name: 'Ruined Gate', text: 'A broken arch frames the entrance to the old city.', exits: { south: 1, east: 3 }, foe: 'Gate prowler', hp: 18, power: 4 },
  { name: 'Echo Crypt', text: 'Your footsteps return from passages below.', exits: { west: 2, down: 4 }, foe: 'Hollow guard', hp: 24, power: 5 },
  { name: 'Glass Vault', text: 'Mineral veins glitter through the stone ceiling.', exits: { up: 3 }, foe: 'Glass wyrm', hp: 40, power: 8 },
  { name: 'River Steps', text: 'Stone steps descend toward a swift silver river.', exits: { west: 0, east: 6 }, foe: 'Reed lurker', hp: 14, power: 3 },
  { name: 'Broken Ford', text: 'A chain of flat stones offers a narrow crossing.', exits: { west: 5, north: 7 }, foe: 'Ford scavenger', hp: 20, power: 4 },
  { name: 'Old Quarry', text: 'Abandoned cranes lean over a flooded excavation.', exits: { south: 6, up: 8 }, foe: 'Stone crawler', hp: 28, power: 6 },
  { name: 'Storm Tower', text: 'A brass sentinel guards the lantern at the summit.', exits: { down: 7 }, foe: 'Brass sentinel', hp: 55, power: 9 }
];
const aliases = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
const maxHp = p => 30 + (p.level - 1) * 5;
function event(w, room, now, text) {
  w.events.push({ seq: ++w.seq, room, at: now, text });
  if (w.events.length > 40) w.events.shift();
}
function description(w, p) {
  const room = rooms[p.room], foe = w.foes[p.room];
  return [room.name, room.text, `Exits: ${Object.keys(room.exits).join(', ')}`, room.foe ? `${room.foe}: ${foe.hp > 0 ? `${foe.hp} HP` : 'defeated; returns in 30 seconds'}` : 'Safe town: REST and SHOP are available.', `Level ${p.level} | HP ${p.hp}/${maxHp(p)} | Gold ${p.gold} | Potions ${p.potions} | XP ${p.xp}/${p.level * 25}`];
}
function combat(w, p, actor, now, rng) {
  const room = rooms[p.room], foe = w.foes[p.room];
  if (!p.fighting || !room.foe || now < p.nextAttack) return;
  if (now >= p.fightUntil) { p.fighting = false; return; }
  p.nextAttack = now + 3000;
  if (foe.hp <= 0) { p.fighting = false; return; }
  const damage = 2 + p.weapon + Math.floor(p.level / 2) + Math.floor(rng() * 4);
  foe.hp = Math.max(0, foe.hp - damage);
  event(w, p.room, now, `${actor.handle} hits ${room.foe} for ${damage}.`);
  if (!foe.hp) {
    foe.respawn = now + 30000;
    const reward = 10 + p.room * 3;
    p.xp += reward; p.totalXp = Math.min(100000000, p.totalXp + reward);
    p.gold = Math.min(1000000, p.gold + 8 + p.room * 2);
    p.fighting = false;
    event(w, p.room, now, `${actor.handle} defeats ${room.foe} and earns ${reward} XP.`);
    while (p.level < 20 && p.xp >= p.level * 25) {
      p.xp -= p.level * 25; p.level++; p.hp = maxHp(p);
      event(w, p.room, now, `${actor.handle} reaches level ${p.level}!`);
    }
    if (p.level === 20) p.xp = Math.min(p.xp, 500);
    if (p.room === 8 && !p.questDone) {
      p.questDone = true; p.gold = Math.min(1000000, p.gold + 100);
      event(w, p.room, now, `${actor.handle} relights the tower lantern! Quest reward: 100 gold.`);
    }
  } else {
    const damageTaken = Math.max(1, room.power + Math.floor(rng() * 3) - p.armor);
    p.hp = Math.max(0, p.hp - damageTaken);
    event(w, p.room, now, `${room.foe} strikes ${actor.handle} for ${damageTaken}.`);
    if (!p.hp) {
      event(w, p.room, now, `${actor.handle} is rescued and carried back to Lantern Square.`);
      p.room = 0; p.hp = Math.ceil(maxHp(p) / 2); p.gold = Math.floor(p.gold * 0.8); p.fighting = false;
      event(w, 0, now, `${actor.handle} returns wounded, losing 20% of their gold.`);
    }
  }
}
export const game = {
  id: 'lantern-hollow', name: 'Lantern Hollow', description: 'Shared fantasy world and live combat.', realtime: true,
  world: () => ({ seq: 0, events: [], foes: rooms.map(r => ({ hp: r.hp ?? 0, respawn: 0 })) }),
  player: actor => ({ handle: actor.handle, room: 0, hp: 30, level: 1, xp: 0, totalXp: 0, gold: 30, potions: 2, weapon: 1, armor: 0, fighting: false, nextAttack: 0, fightUntil: 0, activeAt: 0, inputAt: 0, present: false, questDone: false }),
  score: p => p.totalXp,
  apply({ world: w, player: p, actor, command, now, rng, system, cursor, peers = [] }) {
    if (system === 'leave') { p.fighting = false; p.present = false; return []; }
    const [raw = '', ...args] = command.toLowerCase().split(/\s+/);
    const verb = aliases[raw] ?? raw;
    const lines = [];
    if (system === 'enter') { p.fighting = false; p.present = true; p.inputAt = now; }
    if (!system) { p.inputAt = now; p.present = true; }
    if (system === 'tick' && now - p.inputAt > 120000) {
      const was = p.present; p.present = false; p.fighting = false;
      return was ? ['You are idle. Enter LOOK to become active again.'] : [];
    }
    p.activeAt = now;
    w.foes.forEach((foe, i) => { if (rooms[i].foe && foe.hp === 0 && now >= foe.respawn) { foe.hp = rooms[i].hp; foe.respawn = 0; } });
    if (system === 'tick') combat(w, p, actor, now, rng);
    else if (['help', '?'].includes(verb)) lines.push(
      'LOOK: room and status. MAP: world routes. WHO: recently active adventurers.',
      'NORTH/SOUTH/EAST/WEST/UP/DOWN or N/S/E/W/U/D: move or flee.',
      'ATTACK: fight the shared room enemy automatically every 3 seconds, for up to 60 seconds.',
      'STOP: stop fighting. POTION: heal 20 HP. REST: fully heal in town.',
      'SHOP: town prices. BUY POTION / BUY SWORD / BUY ARMOR: purchase equipment.',
      'SAY <message>: speak in your room (90 characters). INVENTORY: equipment.',
      'SCORES: total XP leaderboard. Q: save and return to the BBS.',
      'Enemies respawn after 30 seconds. The final blow earns rewards; allies can help damage them.',
      'Defeat the Brass sentinel to relight the tower. Death returns you to town with 20% less gold.'
    );
    else if (Object.hasOwn(rooms[p.room].exits, verb)) {
      const old = p.room; p.room = rooms[old].exits[verb]; p.fighting = false;
      event(w, old, now, `${actor.handle} leaves ${verb}.`);
      event(w, p.room, now, `${actor.handle} arrives.`);
      lines.push(...description(w, p));
    } else if (verb === 'attack') {
      requireGame(rooms[p.room].foe && w.foes[p.room].hp > 0, 'There is no living enemy here.');
      p.fighting = true; p.fightUntil = now + 60000;
      combat(w, p, actor, now, rng);
    } else if (verb === 'stop') { p.fighting = false; lines.push('Combat stopped.'); }
    else if (verb === 'rest') {
      requireGame(p.room === 0, 'Return to Lantern Square to rest.');
      p.hp = maxHp(p); p.fighting = false; lines.push('Your health is restored.');
    } else if (verb === 'potion') {
      requireGame(p.potions > 0 && p.hp < maxHp(p), 'You need a potion and missing health.');
      p.potions--; p.hp = Math.min(maxHp(p), p.hp + 20); lines.push(`Health: ${p.hp}/${maxHp(p)}.`);
    } else if (verb === 'shop') lines.push('Town shop: potion 15 gold; sword upgrade 60 x current weapon; armor upgrade 50 x next armor.', 'Weapon limit 10; armor limit 8; potion limit 20. Use BUY POTION, BUY SWORD, or BUY ARMOR.');
    else if (verb === 'buy') {
      requireGame(p.room === 0, 'The shop is in Lantern Square.');
      requireGame(args.length === 1 && ['potion', 'sword', 'armor'].includes(args[0]), 'Buy POTION, SWORD, or ARMOR.');
      const item = args[0], cost = item === 'potion' ? 15 : item === 'sword' ? 60 * p.weapon : 50 * (p.armor + 1);
      requireGame(p.gold >= cost, `You need ${cost} gold.`);
      const field = item === 'potion' ? 'potions' : item === 'sword' ? 'weapon' : 'armor';
      requireGame(p[field] < (item === 'potion' ? 20 : item === 'sword' ? 10 : 8), 'Item limit reached.');
      p.gold -= cost; p[field]++; lines.push(`Purchased ${item} for ${cost} gold.`);
    } else if (verb === 'say') {
      const message = safeText(command.slice(4).trim(), 91);
      requireGame(message.length > 0 && message.length <= 90, 'SAY needs 1-90 printable characters.');
      event(w, p.room, now, `${actor.handle}: ${message}`);
    } else if (verb === 'inventory') lines.push(`Sword ${p.weapon}, armor ${p.armor}, potions ${p.potions}, gold ${p.gold}. Quest: ${p.questDone ? 'completed' : 'relight the tower lantern'}.`);
    else if (verb === 'who') {
      const active = peers.map(r => r.data?.value).filter(v => v?.present && now - v.activeAt <= 15000);
      lines.push('Recently active (up to 30):', ...active.map(v => `${safeText(v.handle, 32)}: ${rooms[v.room]?.name ?? 'unknown room'}`));
      if (!active.length) lines.push('No other recent adventurers.');
    } else if (verb === 'map') lines.push('Square --N--> Briar Road --N--> Ruined Gate --E--> Echo Crypt --D--> Glass Vault', 'Square --E--> River Steps --E--> Broken Ford --N--> Old Quarry --U--> Storm Tower', 'Each route can also be traveled in reverse.');
    else if (['look', 'status'].includes(verb)) lines.push(...description(w, p));
    else requireGame(system === 'tick' || verb === 'scores', 'Unknown command or no exit that way. Type HELP.');
    lines.push(...w.events.filter(e => e.seq > cursor && e.room === p.room).map(e => e.text));
    return lines;
  }
};
