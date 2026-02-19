import { ANSI, c, hr, padRight } from '../../lib/ansi.mjs';
import { printHeader, prompt, upper, isBack } from './_common.mjs';

export class SysopModule {
  constructor() {
    this.state = {
      stage: 'menu',
      buffer: [],
      tmp: {}
    };
  }

  async enter(session) {
    if (!session.user || (session.user.role !== 'SYSOP' && session.user.role !== 'ADMIN')) {
      const { MainMenuModule } = await import('./MainMenuModule.mjs');
      await session.goto(new MainMenuModule());
      return;
    }
    await session.refreshConfig();
    await this.showMenu(session);
  }

  async showMenu(session) {
    this.state.stage = 'menu';
    printHeader(session, 'Sysop');

    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[C]') + 'onfig\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[B]') + 'oards\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[F]') + 'ile areas\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[D]') + 'oors\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[Q]') + 'uit\r\n');
    session.writeAnsi('\r\n');
    prompt(session, 'Selection: ');
    session.setMode('key', true);
  }

  async showConfigMenu(session) {
    await session.refreshConfig();
    const cfg = session.config;

    this.state.stage = 'configMenu';
    printHeader(session, 'Sysop Config');

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, '1) BBS Name: ') + c(ANSI.FG_BRIGHT_CYAN, cfg.bbsName) + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, '2) MOTD:') + '\r\n');
    session.writeAnsi(hr(78));
    session.writeAnsi((cfg.motd || '').replace(/\n/g, '\r\n') + '\r\n');
    session.writeAnsi(hr(78));
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, '3) Min upload/download ratio: ') + c(ANSI.FG_BRIGHT_YELLOW, String(cfg.minUploadDownloadRatio)) + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, '4) Allow registration: ') + c(cfg.allowRegistration ? ANSI.FG_BRIGHT_GREEN : ANSI.FG_BRIGHT_RED, String(cfg.allowRegistration)) + '\r\n');
    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Select 1-4 to edit, or B to go back.') + '\r\n');
    prompt(session, 'Command: ');
    session.setMode('line', true);
  }

  async showBoardsMenu(session) {
    this.state.stage = 'boardsMenu';
    printHeader(session, 'Boards');

    const boards = await session.prisma.board.findMany({ orderBy: { createdAt: 'asc' } });
    this.state.tmp.boards = boards;

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Boards:') + '\r\n');
    session.writeAnsi(hr(78));
    if (boards.length === 0) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, 'No boards.') + '\r\n');
    } else {
      boards.forEach((b, idx) => {
        const n = String(idx + 1).padStart(2, ' ');
        session.writeAnsi(
          c(ANSI.FG_BRIGHT_YELLOW, n) +
            ' ' +
            c(ANSI.FG_BRIGHT_CYAN, padRight(b.name, 22)) +
            ' ' +
            c(ANSI.FG_BRIGHT_WHITE, b.description || '') +
            '\r\n'
        );
      });
    }
    session.writeAnsi(hr(78));
    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'A = add, D # = delete, B = back') + '\r\n');
    prompt(session, 'Command: ');
    session.setMode('line', true);
  }

  async showAreasMenu(session) {
    this.state.stage = 'areasMenu';
    printHeader(session, 'File Areas');

    const areas = await session.prisma.fileArea.findMany({ orderBy: { createdAt: 'asc' } });
    this.state.tmp.areas = areas;

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Areas:') + '\r\n');
    session.writeAnsi(hr(78));
    if (areas.length === 0) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, 'No file areas.') + '\r\n');
    } else {
      areas.forEach((a, idx) => {
        const n = String(idx + 1).padStart(2, ' ');
        const flags = a.freeLeech ? c(ANSI.FG_BRIGHT_GREEN, 'FREELEECH') : '';
        session.writeAnsi(
          c(ANSI.FG_BRIGHT_YELLOW, n) +
            ' ' +
            c(ANSI.FG_BRIGHT_CYAN, padRight(a.name, 22)) +
            ' ' +
            c(ANSI.FG_BRIGHT_WHITE, a.description || '') +
            (flags ? ' ' + flags : '') +
            '\r\n'
        );
      });
    }
    session.writeAnsi(hr(78));
    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'A = add, D # = delete, T # = toggle freeleech, B = back') + '\r\n');
    prompt(session, 'Command: ');
    session.setMode('line', true);
  }

  async showDoorsMenu(session) {
    this.state.stage = 'doorsMenu';
    printHeader(session, 'Doors');

    const doors = await session.prisma.doorPackage.findMany({ orderBy: { name: 'asc' } });
    this.state.tmp.doors = doors;

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Door packages (from ./doors manifests):') + '\r\n');
    session.writeAnsi(hr(78));
    if (doors.length === 0) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, 'No door manifests found.') + '\r\n');
    } else {
      doors.forEach((d, idx) => {
        const n = String(idx + 1).padStart(2, ' ');
        const enabled = d.enabled ? c(ANSI.FG_BRIGHT_GREEN, 'ENABLED') : c(ANSI.FG_BRIGHT_RED, 'DISABLED');
        session.writeAnsi(
          c(ANSI.FG_BRIGHT_YELLOW, n) +
            ' ' +
            c(ANSI.FG_BRIGHT_CYAN, padRight(d.name, 26)) +
            ' ' +
            enabled +
            ' ' +
            c(ANSI.FG_BRIGHT_BLACK, `(${d.doorId})`) +
            '\r\n'
        );
      });
    }
    session.writeAnsi(hr(78));
    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'T # = toggle enable, B = back') + '\r\n');
    prompt(session, 'Command: ');
    session.setMode('line', true);
  }

  parseIdx(arg) {
    const m = String(arg || '').trim().match(/^(\d+)$/);
    if (!m) return null;
    const n = Number.parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
  }

  async onKey(session, key) {
    const k = String(key || '').toUpperCase();

    if (this.state.stage === 'menu') {
      if (k === 'Q') {
        const { MainMenuModule } = await import('./MainMenuModule.mjs');
        await session.goto(new MainMenuModule());
        return;
      }
      if (k === 'C') {
        await this.showConfigMenu(session);
        return;
      }
      if (k === 'B') {
        await this.showBoardsMenu(session);
        return;
      }
      if (k === 'F') {
        await this.showAreasMenu(session);
        return;
      }
      if (k === 'D') {
        await this.showDoorsMenu(session);
        return;
      }
      session.bell();
      return;
    }

    // For most submenus we use line mode.
  }

  async onLine(session, line) {
    const input = String(line || '').trim();

    if (this.state.stage === 'configMenu') {
      if (isBack(input)) {
        await this.showMenu(session);
        return;
      }
      if (input === '1') {
        this.state.stage = 'configName';
        session.writeAnsi('\r\n');
        prompt(session, 'New BBS name: ');
        return;
      }
      if (input === '2') {
        this.state.stage = 'configMotd';
        this.state.buffer = [];
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_WHITE, "Enter MOTD lines. End with a single '.' line.") + '\r\n');
        prompt(session, '> ');
        return;
      }
      if (input === '3') {
        this.state.stage = 'configRatio';
        session.writeAnsi('\r\n');
        prompt(session, 'New min upload/download ratio (e.g. 0.25): ');
        return;
      }
      if (input === '4') {
        const cfg = await session.prisma.bbsConfig.findUnique({ where: { id: 1 } });
        const updated = await session.prisma.bbsConfig.update({
          where: { id: 1 },
          data: { allowRegistration: !cfg.allowRegistration }
        });
        session.config = updated;
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, `allowRegistration=${updated.allowRegistration}`) + '\r\n');
        await this.showConfigMenu(session);
        return;
      }
      session.bell();
      prompt(session, 'Command: ');
      return;
    }

    if (this.state.stage === 'configName') {
      const name = input.trim();
      if (!name) {
        session.bell();
        prompt(session, 'New BBS name: ');
        return;
      }
      const updated = await session.prisma.bbsConfig.update({ where: { id: 1 }, data: { bbsName: name } });
      session.config = updated;
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Updated.') + '\r\n');
      await this.showConfigMenu(session);
      return;
    }

    if (this.state.stage === 'configMotd') {
      if (input === '.') {
        const motd = this.state.buffer.join('\n') + '\n';
        const updated = await session.prisma.bbsConfig.update({ where: { id: 1 }, data: { motd } });
        session.config = updated;
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Updated.') + '\r\n');
        await this.showConfigMenu(session);
        return;
      }
      this.state.buffer.push(input);
      prompt(session, '> ');
      return;
    }

    if (this.state.stage === 'configRatio') {
      const v = Number.parseFloat(input);
      if (!Number.isFinite(v) || v < 0) {
        session.bell();
        prompt(session, 'New min upload/download ratio (e.g. 0.25): ');
        return;
      }
      const updated = await session.prisma.bbsConfig.update({ where: { id: 1 }, data: { minUploadDownloadRatio: v } });
      session.config = updated;
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Updated.') + '\r\n');
      await this.showConfigMenu(session);
      return;
    }

    if (this.state.stage === 'boardsMenu') {
      if (isBack(input)) {
        await this.showMenu(session);
        return;
      }

      const cmd = upper(input);
      if (cmd === 'A') {
        this.state.stage = 'boardAddName';
        session.writeAnsi('\r\n');
        prompt(session, 'Board name: ');
        return;
      }

      if (cmd.startsWith('D')) {
        const idx = this.parseIdx(input.replace(/^D\s*/i, ''));
        const boards = this.state.tmp.boards || [];
        if (!idx || idx < 1 || idx > boards.length) {
          session.bell();
          prompt(session, 'Command: ');
          return;
        }
        const b = boards[idx - 1];
        await session.prisma.board.delete({ where: { id: b.id } });
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Deleted.') + '\r\n');
        await this.showBoardsMenu(session);
        return;
      }

      session.bell();
      prompt(session, 'Command: ');
      return;
    }

    if (this.state.stage === 'boardAddName') {
      const name = input.trim();
      if (!name) {
        session.bell();
        prompt(session, 'Board name: ');
        return;
      }
      this.state.tmp.newBoardName = name;
      this.state.stage = 'boardAddDesc';
      session.writeAnsi('\r\n');
      prompt(session, 'Description: ');
      return;
    }

    if (this.state.stage === 'boardAddDesc') {
      const desc = input.trim();
      await session.prisma.board.create({ data: { name: this.state.tmp.newBoardName, description: desc } });
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Created.') + '\r\n');
      await this.showBoardsMenu(session);
      return;
    }

    if (this.state.stage === 'areasMenu') {
      if (isBack(input)) {
        await this.showMenu(session);
        return;
      }

      const cmd = upper(input);
      if (cmd === 'A') {
        this.state.stage = 'areaAddName';
        session.writeAnsi('\r\n');
        prompt(session, 'Area name: ');
        return;
      }

      if (cmd.startsWith('D')) {
        const idx = this.parseIdx(input.replace(/^D\s*/i, ''));
        const areas = this.state.tmp.areas || [];
        if (!idx || idx < 1 || idx > areas.length) {
          session.bell();
          prompt(session, 'Command: ');
          return;
        }
        const a = areas[idx - 1];
        await session.prisma.fileArea.delete({ where: { id: a.id } });
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Deleted.') + '\r\n');
        await this.showAreasMenu(session);
        return;
      }

      if (cmd.startsWith('T')) {
        const idx = this.parseIdx(input.replace(/^T\s*/i, ''));
        const areas = this.state.tmp.areas || [];
        if (!idx || idx < 1 || idx > areas.length) {
          session.bell();
          prompt(session, 'Command: ');
          return;
        }
        const a = areas[idx - 1];
        await session.prisma.fileArea.update({ where: { id: a.id }, data: { freeLeech: !a.freeLeech } });
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Toggled.') + '\r\n');
        await this.showAreasMenu(session);
        return;
      }

      session.bell();
      prompt(session, 'Command: ');
      return;
    }

    if (this.state.stage === 'areaAddName') {
      const name = input.trim();
      if (!name) {
        session.bell();
        prompt(session, 'Area name: ');
        return;
      }
      this.state.tmp.newAreaName = name;
      this.state.stage = 'areaAddDesc';
      session.writeAnsi('\r\n');
      prompt(session, 'Description: ');
      return;
    }

    if (this.state.stage === 'areaAddDesc') {
      const desc = input.trim();
      await session.prisma.fileArea.create({ data: { name: this.state.tmp.newAreaName, description: desc, freeLeech: false } });
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Created.') + '\r\n');
      await this.showAreasMenu(session);
      return;
    }

    if (this.state.stage === 'doorsMenu') {
      if (isBack(input)) {
        await this.showMenu(session);
        return;
      }
      const cmd = upper(input);
      if (cmd.startsWith('T')) {
        const idx = this.parseIdx(input.replace(/^T\s*/i, ''));
        const doors = this.state.tmp.doors || [];
        if (!idx || idx < 1 || idx > doors.length) {
          session.bell();
          prompt(session, 'Command: ');
          return;
        }
        const d = doors[idx - 1];
        await session.prisma.doorPackage.update({ where: { id: d.id }, data: { enabled: !d.enabled } });
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Toggled.') + '\r\n');
        await this.showDoorsMenu(session);
        return;
      }
      session.bell();
      prompt(session, 'Command: ');
      return;
    }
  }
}
