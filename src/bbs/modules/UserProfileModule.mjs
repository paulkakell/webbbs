import { ANSI, c, hr } from '../../lib/ansi.mjs';
import { formatBytes, ratioString, leechRating } from '../../lib/format.mjs';
import { printHeader } from './_common.mjs';

export class UserProfileModule {
  async enter(session) {
    await session.refreshConfig();
    printHeader(session, 'User Profile');

    const u = session.user;
    if (!u) {
      const { LoginModule } = await import('./LoginModule.mjs');
      await session.goto(new LoginModule());
      return;
    }

    const rating = leechRating(u.uploadBytes, u.downloadBytes);

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Handle: ') + c(ANSI.FG_BRIGHT_YELLOW, u.handle) + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Role:   ') + c(ANSI.FG_BRIGHT_CYAN, u.role) + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Joined: ') + c(ANSI.FG_BRIGHT_WHITE, new Date(u.createdAt).toLocaleString()) + '\r\n');
    session.writeAnsi(
      c(ANSI.FG_BRIGHT_WHITE, 'Last:   ') +
        c(ANSI.FG_BRIGHT_WHITE, u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'n/a') +
        '\r\n'
    );

    session.writeAnsi(hr(78));

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Uploaded:   ') + c(ANSI.FG_GREEN, formatBytes(u.uploadBytes)) + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Downloaded: ') + c(ANSI.FG_RED, formatBytes(u.downloadBytes)) + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Ratio:      ') + c(ANSI.FG_BRIGHT_MAGENTA, ratioString(u.uploadBytes, u.downloadBytes)) + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Leech:      ') + c(ANSI.FG_BRIGHT_MAGENTA, rating.label) + '\r\n');

    session.writeAnsi(hr(78));

    session.writeAnsi(
      c(ANSI.FG_BRIGHT_WHITE, 'Minimum upload/download ratio required for downloads: ') +
        c(ANSI.FG_BRIGHT_YELLOW, String(session.config?.minUploadDownloadRatio ?? 0)) +
        '\r\n'
    );

    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_GREEN, 'Press any key to return...'));
    session.setMode('key', true);
  }

  async onKey(session, _key) {
    const { MainMenuModule } = await import('./MainMenuModule.mjs');
    await session.goto(new MainMenuModule());
  }
}
