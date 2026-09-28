import { DoorError, executeDoor } from './door-store.mjs';

/** Adapter for the existing createModule/enter/onLine door contract. */
export function createNativeDoor(game) {
  return {
    doorId: game.id, name: game.name, description: game.description, type: 'INTERNAL',
    async createModule(opts = {}) {
      let timer;
      let busy = false;
      let stopped = false;
      let cursor = 0;
      let nextInput = 0;
      const stop = () => { stopped = true; clearInterval(timer); };
      const module = {
        async enter(session) {
          session.clear();
          session.writeAnsi(`\x1b[1;36m${game.name}\x1b[0m\r\nOriginal webBBS door | HELP for commands | Q to return\r\n\r\n`);
          session.setMode('line', true);
          await run(session, 'look', 'enter');
          if (game.realtime && !stopped) {
            timer = setInterval(() => {
              if (!session.alive || session.currentModule !== module) return stop();
              void run(session, '', 'tick');
            }, 3000);
            timer.unref?.();
          }
        },
        async onLine(session, line) {
          if (stopped) return;
          if (busy) return;
          if (/^(q|quit|b|back)$/i.test(line.trim())) {
            stop();
            await run(session, '', 'leave');
            if (opts.onExit) await opts.onExit();
            else {
              const { DoorsModule } = await import('../bbs/modules/DoorsModule.mjs');
              await session.goto(new DoorsModule());
            }
            return;
          }
          if (Date.now() < nextInput) return;
          nextInput = Date.now() + 350;
          await run(session, line);
        }
      };
      async function run(session, line, system) {
        if (busy || (stopped && system !== 'leave')) return;
        busy = true;
        try {
          const result = await executeDoor(session.prisma, game, session.user, line, { system, cursor });
          cursor = result.cursor;
          if (!stopped && result.lines.length) {
            session.writeAnsi(result.lines.join('\r\n') + '\r\n');
            if (system === 'tick') session.writeAnsi(`${game.name}> `);
          }
        } catch (error) {
          if (!stopped) session.writeAnsi((error instanceof DoorError ? error.message : 'The action could not be saved. Please retry.') + '\r\n');
          if (system === 'tick' && error instanceof DoorError) clearInterval(timer);
          if (!(error instanceof DoorError)) console.error(JSON.stringify({ event: 'door_action_failed', doorId: game.id, code: typeof error.code === 'string' ? error.code : 'internal' }));
        } finally {
          busy = false;
          if (!stopped && system !== 'tick') session.writeAnsi(`${game.name}> `);
        }
      }
      return module;
    }
  };
}
