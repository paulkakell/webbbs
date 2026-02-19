import { ANSI, c, hr, padRight } from '../../lib/ansi.mjs';
import { printHeader, prompt, isBack } from './_common.mjs';

export class DoorsModule {
  constructor() {
    this.state = {
      doors: []
    };
  }

  async enter(session) {
    if (!session.user) {
      const { LoginModule } = await import('./LoginModule.mjs');
      await session.goto(new LoginModule());
      return;
    }

    printHeader(session, 'Doors');

    const installed = await session.listEnabledDoors();
    this.state.doors = installed;

    if (installed.length === 0) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, 'No doors installed/enabled.') + '\r\n');
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, 'Sysop/Admin can install doors from the web admin UI or Sysop menu.') + '\r\n');
      session.writeAnsi('\r\n');
      prompt(session, 'Press any key to return...');
      session.setMode('key', true);
      this.state.stage = 'empty';
      return;
    }

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Doors:') + '\r\n');
    session.writeAnsi(hr(78));

    installed.forEach((d, idx) => {
      const n = String(idx + 1).padStart(2, ' ');
      session.writeAnsi(
        c(ANSI.FG_BRIGHT_YELLOW, n) +
          ' ' +
          c(ANSI.FG_BRIGHT_CYAN, padRight(d.name, 26)) +
          ' ' +
          c(ANSI.FG_BRIGHT_WHITE, d.description || '') +
          '\r\n'
      );
    });

    session.writeAnsi(hr(78));
    session.writeAnsi('\r\n');
    prompt(session, 'Select door #, or B to return: ');
    session.setMode('line', true);
    this.state.stage = 'list';
  }

  async onKey(session, _key) {
    if (this.state.stage === 'empty') {
      const { MainMenuModule } = await import('./MainMenuModule.mjs');
      await session.goto(new MainMenuModule());
    }
  }

  async onLine(session, line) {
    const input = String(line || '').trim();

    if (isBack(input)) {
      const { MainMenuModule } = await import('./MainMenuModule.mjs');
      await session.goto(new MainMenuModule());
      return;
    }

    const n = Number.parseInt(input, 10);
    if (!Number.isFinite(n) || n < 1 || n > this.state.doors.length) {
      session.bell();
      prompt(session, 'Select door #, or B to return: ');
      return;
    }

    const row = this.state.doors[n - 1];
    const doorPkg = session.doorRegistry.get(row.doorId);
    if (!doorPkg) {
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, 'Door package not found on server filesystem.') + '\r\n');
      prompt(session, 'Select door #, or B to return: ');
      return;
    }

    if (row.type === 'EXTERNAL' || doorPkg.type === 'EXTERNAL') {
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_YELLOW, 'External doors are stubbed in this version.') + '\r\n');
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, 'Implement a PTY runner to attach external processes to a websocket.') + '\r\n');
      prompt(session, 'Select door #, or B to return: ');
      return;
    }

    const onExit = async () => {
      await session.goto(new DoorsModule());
    };

    const mod = await doorPkg.createModule({ onExit });
    await session.goto(mod);
  }
}
