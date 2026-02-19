import { ANSI, c, hr } from '../../src/lib/ansi.mjs';
import { printHeader, prompt, upper } from '../../src/bbs/modules/_common.mjs';

class AnsiClockDoorModule {
  constructor(opts) {
    this.onExit = opts?.onExit;
  }

  async enter(session) {
    await this.render(session);
  }

  async render(session) {
    printHeader(session, 'Door: ANSI Clock');
    const now = new Date();

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Server time:') + '\r\n');
    session.writeAnsi(hr(78));
    session.writeAnsi(c(ANSI.FG_BRIGHT_CYAN, now.toLocaleString()) + '\r\n');
    session.writeAnsi(hr(78));
    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'R = refresh, Q = quit') + '\r\n');
    prompt(session, 'Command: ');
    session.setMode('key', true);
  }

  async onKey(session, key) {
    const k = upper(key);
    if (k === 'R') {
      await this.render(session);
      return;
    }
    if (k === 'Q' || k === 'B') {
      await this.exit(session);
      return;
    }
  }

  async exit(session) {
    if (this.onExit) {
      await this.onExit();
    } else {
      const { DoorsModule } = await import('../../src/bbs/modules/DoorsModule.mjs');
      await session.goto(new DoorsModule());
    }
  }
}

export const door = {
  doorId: 'ansi-clock',
  name: 'ANSI Clock',
  description: 'Shows the current server time.',
  type: 'INTERNAL',
  async createModule(opts) {
    return new AnsiClockDoorModule(opts);
  }
};
