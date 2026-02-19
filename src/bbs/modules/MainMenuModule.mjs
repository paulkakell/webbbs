import { ANSI, c, hr } from '../../lib/ansi.mjs';
import { formatBytes, ratioString, leechRating } from '../../lib/format.mjs';
import { printHeader } from './_common.mjs';

export class MainMenuModule {
  async enter(session) {
    await session.refreshConfig();
    printHeader(session, 'Main Menu');

    const u = session.user;
    if (!u) {
      const { LoginModule } = await import('./LoginModule.mjs');
      await session.goto(new LoginModule());
      return;
    }

    const rating = leechRating(u.uploadBytes, u.downloadBytes);

    session.writeAnsi(
      c(ANSI.FG_BRIGHT_WHITE, 'User: ') +
        c(ANSI.FG_BRIGHT_YELLOW, u.handle) +
        '   ' +
        c(ANSI.FG_BRIGHT_WHITE, 'Role: ') +
        c(ANSI.FG_BRIGHT_CYAN, u.role) +
        '\r\n'
    );
    session.writeAnsi(
      c(ANSI.FG_BRIGHT_WHITE, 'Uploaded: ') +
        c(ANSI.FG_GREEN, formatBytes(u.uploadBytes)) +
        '   ' +
        c(ANSI.FG_BRIGHT_WHITE, 'Downloaded: ') +
        c(ANSI.FG_RED, formatBytes(u.downloadBytes)) +
        '   ' +
        c(ANSI.FG_BRIGHT_WHITE, 'Ratio: ') +
        c(ANSI.FG_BRIGHT_MAGENTA, ratioString(u.uploadBytes, u.downloadBytes)) +
        '   ' +
        c(ANSI.FG_BRIGHT_WHITE, 'Leech: ') +
        c(ANSI.FG_BRIGHT_MAGENTA, rating.label) +
        '\r\n'
    );
    session.writeAnsi(hr(78));

    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[M]') + 'essage boards\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[F]') + 'ile areas\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[D]') + 'oors\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[U]') + 'ser profile\r\n');

    if (u.role === 'SYSOP' || u.role === 'ADMIN') {
      session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[S]') + 'ysop\r\n');
    }

    session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, '[G]') + 'oodbye\r\n');
    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_GREEN, 'Selection: '));

    session.setMode('key', true);
  }

  async onKey(session, key) {
    const k = String(key || '').toUpperCase();

    if (k === 'M') {
      const { MessagesModule } = await import('./MessagesModule.mjs');
      await session.goto(new MessagesModule());
      return;
    }
    if (k === 'F') {
      const { FilesModule } = await import('./FilesModule.mjs');
      await session.goto(new FilesModule());
      return;
    }
    if (k === 'D') {
      const { DoorsModule } = await import('./DoorsModule.mjs');
      await session.goto(new DoorsModule());
      return;
    }
    if (k === 'U') {
      const { UserProfileModule } = await import('./UserProfileModule.mjs');
      await session.goto(new UserProfileModule());
      return;
    }
    if (k === 'S') {
      if (session.user?.role === 'SYSOP' || session.user?.role === 'ADMIN') {
        const { SysopModule } = await import('./SysopModule.mjs');
        await session.goto(new SysopModule());
        return;
      }
      session.bell();
      return;
    }
    if (k === 'G' || k === 'Q') {
      await session.logout();
      const { LoginModule } = await import('./LoginModule.mjs');
      await session.goto(new LoginModule());
      return;
    }

    // ignore other keys
  }
}
