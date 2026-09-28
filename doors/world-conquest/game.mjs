import { integer, requireGame } from '../../src/lib/door-store.mjs';

const names = ['Northport', 'Frostland', 'Pinewatch', 'Eastreach', 'Westhaven', 'Highplain', 'Crossroads', 'Dawncoast', 'Southbay', 'Redmesa', 'Lowmarsh', 'Sunharbor'];
const adjacent = (a, b) => (Math.floor(a / 4) === Math.floor(b / 4) && Math.abs(a - b) === 1) || Math.abs(a - b) === 4;
const owned = (m, id) => m.lands.filter(t => t.owner === id);
const fresh = (now) => ({ phase: 'lobby', members: [], lands: [], turn: 0, reserve: 0, fortified: false, deadline: 0, created: now, winner: null });
function reinforce(m) {
  const id = m.members[m.turn].id;
  m.reserve = Math.max(3, Math.floor(owned(m, id).length / 3));
  for (let row = 0; row < 3; row++) if (m.lands.slice(row * 4, row * 4 + 4).every(t => t.owner === id)) m.reserve += 2;
  m.fortified = false;
}
function start(m, now) {
  m.phase = 'playing';
  m.lands = names.map((name, i) => ({ name, owner: m.members[i % m.members.length].id, troops: 3 }));
  m.turn = 0;
  m.deadline = now + 86400000;
  reinforce(m);
}
function battle(m, from, to, rng, lines) {
  const a = m.lands[from], d = m.lands[to];
  const dice = (n) => Array.from({ length: n }, () => 1 + Math.floor(rng() * 6)).sort((x, y) => y - x);
  const attack = dice(Math.min(3, a.troops - 1)), defend = dice(Math.min(2, d.troops));
  for (let i = 0; i < Math.min(attack.length, defend.length); i++) {
    if (attack[i] > defend[i]) d.troops--; else a.troops--;
  }
  lines.push(`${a.name} attacks ${d.name}: dice ${attack.join(',')} vs ${defend.join(',')}.`);
  if (d.troops === 0) {
    d.owner = a.owner;
    d.troops = Math.min(3, a.troops - 1);
    a.troops -= d.troops;
    lines.push(`${d.name} captured!`);
  }
  if (m.lands.every(t => t.owner === a.owner)) {
    m.phase = 'finished'; m.winner = a.owner;
    lines.push(`${m.members.find(p => p.id === a.owner).name} controls the entire map!`);
  }
}
function next(m, now, rng, lines) {
  // At most four seats; skip eliminated players without an unbounded loop.
  for (let step = 0; step < m.members.length; step++) {
    m.turn = (m.turn + 1) % m.members.length;
    if (owned(m, m.members[m.turn].id).length) break;
  }
  m.deadline = now + 86400000;
  reinforce(m);
  const actor = m.members[m.turn];
  if (!actor.bot) return;
  const borders = m.lands.map((t, i) => ({ t, i })).filter(({ t, i }) => t.owner === actor.id && m.lands.some((e, j) => e.owner !== actor.id && adjacent(i, j)));
  borders.sort((a, b) => b.t.troops - a.t.troops);
  if (borders[0]) borders[0].t.troops = Math.min(10000, borders[0].t.troops + m.reserve);
  m.reserve = 0;
  for (let n = 0; n < 10 && m.phase === 'playing'; n++) {
    const attacks = [];
    m.lands.forEach((t, i) => {
      if (t.owner !== actor.id || t.troops < 2) return;
      m.lands.forEach((d, j) => { if (d.owner !== actor.id && adjacent(i, j)) attacks.push({ i, j, advantage: t.troops - d.troops }); });
    });
    attacks.sort((a, b) => b.advantage - a.advantage);
    if (!attacks.length || attacks[0].advantage < 0) break;
    battle(m, attacks[0].i, attacks[0].j, rng, lines);
  }
  if (m.phase === 'playing') {
    m.turn = 0; m.deadline = now + 86400000; reinforce(m);
  }
}
function map(m) {
  if (m.phase === 'lobby') return ['Shared lobby: ' + (m.members.map(x => x.name).join(', ') || 'empty'), 'JOIN to take a seat. START with 2-4 humans, or SOLO for a private CPU campaign.'];
  const legend = m.members.map((p, i) => `${i + 1}=${p.name}`).join(' | ');
  const lines = [legend];
  for (let row = 0; row < 3; row++) {
    lines.push(m.lands.slice(row * 4, row * 4 + 4).map((t, i) => `${String(row * 4 + i + 1).padStart(2)}:${t.name.padEnd(10)} ${m.members.findIndex(p => p.id === t.owner) + 1}/${t.troops}`).join(' | '));
  }
  lines.push('Each cell: territory:name owner/troops. Neighbors share an edge.');
  lines.push(m.phase === 'finished' ? `Winner: ${m.members.find(p => p.id === m.winner)?.name}` : `Turn: ${m.members[m.turn].name}; reserves: ${m.reserve}; deadline: ${new Date(m.deadline).toISOString()}`);
  return lines;
}
export const game = {
  id: 'world-conquest', name: 'World Conquest', description: 'Territory strategy: multiplayer or CPU.',
  world: fresh,
  player: (actor) => ({ handle: actor.handle, mode: 'shared', campaign: null, wins: 0 }),
  score: p => p.wins,
  apply({ world, player, actor, command, now, rng, system }) {
    if (system === 'leave') return [];
    const [verb = '', ...args] = command.toLowerCase().split(/\s+/);
    const lines = [];
    if (verb === 'solo') {
      player.mode = 'solo';
      if (!player.campaign) {
        player.campaign = fresh(now);
        player.campaign.members = [{ id: actor.id, name: actor.handle }, { id: 'cpu', name: 'Iron Circuit', bot: true }];
        start(player.campaign, now);
      }
    }
    if (verb === 'lobby') player.mode = 'shared';
    const m = player.mode === 'solo' ? player.campaign : world;
    if (['help', '?'].includes(verb)) return [
      'SOLO: start/resume your private CPU campaign. LOBBY: shared multiplayer.',
      'JOIN: enter the shared lobby (4 seats). START: host begins with 2-4 players.',
      'MAP / LOOK / STATUS: show the map. SCORES: lifetime victories.',
      'REINFORCE <territory> <troops>: deploy reserves before attacking.',
      'ATTACK <from> <to>: one dice battle against an adjacent enemy.',
      'FORTIFY <from> <to> <troops>: one transfer per turn between adjacent owned cells.',
      'END: finish turn; unused reserves deploy automatically. CPU responds in solo mode.',
      'CLAIM: skip a multiplayer turn after its 24-hour deadline.',
      'LEAVE: leave an unstarted lobby. NEW CONFIRM: reset a finished match.',
      'Q: return to BBS without losing your seat or saved campaign.',
      'Conquer all 12 territories. Defender wins ties. Complete rows grant +2 reserves.'
    ];
    if (verb === 'join') {
      requireGame(player.mode === 'shared' && m.phase === 'lobby', 'Use LOBBY; joining is only possible before a shared match starts.');
      requireGame(m.members.length < 4 && !m.members.some(p => p.id === actor.id), 'Lobby full or already joined.');
      if (m.members.length === 0) m.created = now;
      m.members.push({ id: actor.id, name: actor.handle });
    } else if (verb === 'leave') {
      requireGame(m.phase === 'lobby', 'A started match keeps your seat. Q returns to the BBS.');
      m.members = m.members.filter(p => p.id !== actor.id);
    } else if (verb === 'start') {
      requireGame(m.phase === 'lobby' && m.members.length >= 2, 'At least two players must JOIN.');
      requireGame(m.members[0].id === actor.id || (now - m.created > 1800000 && m.members.some(p => p.id === actor.id)), 'Only the host can start during the first 30 minutes.');
      start(m, now);
    } else if (verb === 'new') {
      requireGame(args.join(' ') === 'confirm' && m.phase === 'finished' && m.members.some(p => p.id === actor.id), 'Use NEW CONFIRM after your match has finished.');
      if (player.mode === 'solo') { player.campaign = null; player.mode = 'shared'; return ['Campaign cleared. SOLO starts a new one.']; }
      Object.assign(world, fresh(now));
    } else if (['reinforce', 'attack', 'fortify', 'end', 'claim'].includes(verb)) {
      requireGame(m?.phase === 'playing', 'Start a match first.');
      requireGame(m.members.some(p => p.id === actor.id), 'You are a spectator in this match.');
      if (verb === 'claim') {
        requireGame(player.mode === 'shared' && now >= m.deadline, 'The current turn has not expired.');
        const home = owned(m, m.members[m.turn].id)[0];
        if (home) home.troops = Math.min(10000, home.troops + m.reserve);
        next(m, now, rng, lines);
      } else {
        requireGame(m.members[m.turn].id === actor.id, 'Wait for your turn.');
        if (verb === 'end') {
          const home = owned(m, actor.id)[0];
          home.troops = Math.min(10000, home.troops + m.reserve);
          next(m, now, rng, lines);
        } else {
          const from = integer(args[0], 1, 12) - 1;
          requireGame(m.lands[from].owner === actor.id, 'You do not own the source territory.');
          if (verb === 'reinforce') {
            requireGame(args.length === 2, 'Use REINFORCE territory troops.');
            const n = integer(args[1], 1, m.reserve);
            requireGame(m.lands[from].troops + n <= 10000, 'This territory has reached its troop limit.');
            m.lands[from].troops += n; m.reserve -= n;
          } else {
            requireGame(m.reserve === 0, 'Deploy all reserves before attacking or fortifying.');
            const to = integer(args[1], 1, 12) - 1;
            requireGame(adjacent(from, to), 'Territories must share an edge.');
            if (verb === 'attack') {
              requireGame(args.length === 2 && m.lands[to].owner !== actor.id && m.lands[from].troops > 1, 'Attack an adjacent enemy from a territory with at least two troops.');
              battle(m, from, to, rng, lines);
              if (m.phase === 'finished' && m.winner === actor.id) player.wins = Math.min(1000000, player.wins + 1);
            } else {
              requireGame(args.length === 3 && !m.fortified && m.lands[to].owner === actor.id, 'Fortify once per turn between your territories.');
              const n = integer(args[2], 1, m.lands[from].troops - 1);
              requireGame(m.lands[to].troops + n <= 10000, 'The destination has reached its troop limit.');
              m.lands[from].troops -= n; m.lands[to].troops += n; m.fortified = true;
            }
          }
        }
      }
    } else requireGame(['', 'look', 'status', 'map', 'scores', 'solo', 'lobby'].includes(verb), 'Unknown command. Type HELP.');
    return [...lines, `Mode: ${player.mode}`, ...map(m ?? fresh(now))];
  }
};
