import { requireGame, safeText } from '../../src/lib/door-store.mjs';

const today = now => new Date(now).toISOString().slice(0, 10);
const initial = (actor, now) => ({ handle: actor.handle, name: `${actor.handle}'s BBS`, day: 1, cash: 500, users: 10, modems: 1, disks: 1, files: 10, staff: 0, quality: 1, reputation: 50, turns: 10, date: today(now), closed: false, achieved: false });
const worth = p => p.cash + p.modems * 150 + p.disks * 80 + p.files * 2 + p.quality * 100 + p.users * 5;
const report = p => [
  `${p.name} | simulated day ${p.day}${p.closed ? ' | CLOSED' : ''}`,
  `Cash $${p.cash} | Members ${p.users} | Reputation ${p.reputation}/100`,
  `Modems ${p.modems} (capacity ${p.modems * 30}) | Files ${p.files}/${p.disks * 50} | Staff ${p.staff} | Quality ${p.quality}`,
  `Company value $${worth(p)} | Day advances left today: ${p.turns}/10 (refills at 00:00 UTC)`
];
export const game = {
  id: 'modem-mogul', name: 'Modem Mogul', description: 'Build and manage your own virtual BBS.',
  world: () => ({}), player: initial, score: worth,
  apply({ player: p, actor, command, now, rng, system }) {
    if (system === 'leave') return [];
    // Refill only when UTC advances, never when the server clock moves backward.
    if (today(now) > p.date) { p.turns = 10; p.date = today(now); }
    const [verb = '', ...args] = command.toLowerCase().split(/\s+/);
    if (['help', '?'].includes(verb)) return [
      'STATUS / LOOK: business report. NAME <name>: rename your simulated BBS (32 characters).',
      'BUY MODEM ($200): +30 member capacity. BUY DISK ($100): +50 file capacity.',
      'BUY FILES ($40): +10 files. UPGRADE: quality +1, costs $150 x current quality.',
      'HIRE ($150): add a worker; each costs $20/day and reduces outages. FIRE: remove one.',
      'ADVERTISE ($50): raise reputation by 5. NEXT: run one simulated day.',
      'Each day earns $2/member, pays $10/modem + $5/disk + $20/worker, and may have an event.',
      'Quality, files, and reputation attract members; insufficient modem capacity drives them away.',
      'Goal: 1,000 members. Ten day advances per UTC day; unused turns do not accumulate.',
      'SCORES: company-value leaderboard. RESTART CONFIRM: reset a closed or successful business.',
      'Q: save and return to the BBS. This economy uses fictional money only.'
    ];
    if (verb === 'restart') {
      requireGame(args.join(' ') === 'confirm' && (p.closed || p.achieved), 'Use RESTART CONFIRM after closure or reaching 1,000 members.');
      const turns = p.turns, date = p.date, nextInputAt = p.nextInputAt;
      Object.assign(p, initial(actor, now), { turns, date, nextInputAt });
      return ['New business created; your remaining daily turns are unchanged.', ...report(p)];
    }
    const lines = [];
    if (!['look', 'status', 'scores'].includes(verb)) requireGame(!p.closed, 'Your business is closed. Use RESTART CONFIRM.');
    const spend = amount => { requireGame(p.cash >= amount, `You need $${amount}.`); p.cash -= amount; };
    if (verb === 'name') {
      const name = safeText(command.slice(5).trim(), 33);
      requireGame(name.length > 0 && name.length <= 32, 'Choose a name of 1-32 characters.'); p.name = name;
    } else if (verb === 'buy') {
      requireGame(args.length === 1 && ['modem', 'disk', 'files'].includes(args[0]), 'Buy MODEM, DISK, or FILES.');
      if (args[0] === 'modem') { requireGame(p.modems < 100, 'Modem limit: 100.'); spend(200); p.modems++; }
      if (args[0] === 'disk') { requireGame(p.disks < 100, 'Disk limit: 100.'); spend(100); p.disks++; }
      if (args[0] === 'files') { requireGame(p.files + 10 <= p.disks * 50, 'Buy more disk storage first.'); spend(40); p.files += 10; }
    } else if (verb === 'hire') { requireGame(p.staff < 20, 'Staff limit: 20.'); spend(150); p.staff++; }
    else if (verb === 'fire') { requireGame(p.staff > 0, 'There are no staff to dismiss.'); p.staff--; }
    else if (verb === 'upgrade') { requireGame(p.quality < 10, 'Quality limit: 10.'); spend(150 * p.quality); p.quality++; }
    else if (verb === 'advertise') { requireGame(p.reputation < 100, 'Reputation is already 100.'); spend(50); p.reputation = Math.min(100, p.reputation + 5); }
    else if (verb === 'next') {
      requireGame(p.turns > 0, 'No day advances remain. They refill at 00:00 UTC.');
      p.turns--; p.day++;
      const capacity = p.modems * 30;
      const growth = Math.max(1, Math.floor(p.quality + p.files / 25 + p.reputation / 20));
      p.users = Math.min(capacity, Math.max(0, p.users + growth));
      const income = p.users * 2, expenses = p.modems * 10 + p.disks * 5 + p.staff * 20;
      p.cash = Math.min(100000000, p.cash + income - expenses);
      lines.push(`Day ${p.day}: income $${income}, operating costs $${expenses}.`);
      const chance = rng();
      if (chance < Math.max(0.03, 0.18 - p.staff * 0.03)) {
        p.cash -= 40; p.reputation = Math.max(0, p.reputation - 5);
        lines.push('An equipment fault costs $40 and 5 reputation.');
      } else if (chance > 0.85) {
        p.reputation = Math.min(100, p.reputation + 4); p.cash = Math.min(100000000, p.cash + 50);
        lines.push('A favorable review brings a $50 donation and 4 reputation.');
      }
      if (p.users >= capacity) { p.reputation = Math.max(0, p.reputation - 2); lines.push('All lines are busy. Add modems to support more members.'); }
      if (p.cash < 0) { p.cash = 0; p.closed = true; lines.push('The business cannot pay its bills and closes.'); }
      if (!p.achieved && p.users >= 1000) { p.achieved = true; lines.push('Milestone reached: 1,000 members! Keep expanding or start again.'); }
    } else requireGame(['look', 'status', 'scores'].includes(verb), 'Unknown command. Type HELP.');
    return [...lines, ...report(p)];
  }
};
