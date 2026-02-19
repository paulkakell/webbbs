import { ANSI, c } from '../../lib/ansi.mjs';
import { hashPassword, verifyPassword } from '../../lib/auth.mjs';
import { printHeader, prompt, upper } from './_common.mjs';

export class LoginModule {
  constructor() {
    this.state = {
      step: 'handle',
      registering: false,
      handle: ''
    };
  }

  async enter(session) {
    await session.refreshConfig();
    printHeader(session, 'Logon');

    if (session.config?.motd) {
      session.writeAnsi(session.config.motd.replace(/\n/g, '\r\n'));
      if (!session.config.motd.endsWith('\n') && !session.config.motd.endsWith('\r\n')) {
        session.writeAnsi('\r\n');
      }
      session.writeAnsi('\r\n');
    }

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Enter your handle to log in.'));
    session.writeAnsi('\r\n');
    if (session.config?.allowRegistration) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, "Type ") + c(ANSI.FG_BRIGHT_YELLOW, 'NEW') + c(ANSI.FG_BRIGHT_WHITE, ' to create an account.'));
      session.writeAnsi('\r\n');
    }
    session.writeAnsi('\r\n');

    this.state.step = 'handle';
    this.state.registering = false;
    this.state.handle = '';

    session.setMode('line', true);
    prompt(session, 'Handle: ');
  }

  async onLine(session, line) {
    const input = String(line || '').trim();
    const cmd = upper(input);

    if (this.state.step === 'handle') {
      if (cmd === 'NEW' || cmd === 'N') {
        if (!session.config?.allowRegistration) {
          session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, 'Registration is disabled.') + '\r\n\r\n');
          prompt(session, 'Handle: ');
          return;
        }
        this.state.registering = true;
        this.state.step = 'newHandle';
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_CYAN, 'New user registration') + '\r\n');
        prompt(session, 'New handle: ');
        return;
      }

      if (!input) {
        prompt(session, 'Handle: ');
        return;
      }

      const user = await session.prisma.user.findUnique({ where: { handle: input } });
      if (!user) {
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, 'Unknown user.') + '\r\n\r\n');
        prompt(session, 'Handle: ');
        return;
      }

      this.state.handle = user.handle;
      this.state.userId = user.id;
      this.state.step = 'password';
      session.setMode('line', false);
      session.writeAnsi('\r\n');
      prompt(session, 'Password: ');
      return;
    }

    if (this.state.step === 'newHandle') {
      if (!input) {
        prompt(session, 'New handle: ');
        return;
      }
      const existing = await session.prisma.user.findUnique({ where: { handle: input } });
      if (existing) {
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, 'That handle is already taken.') + '\r\n\r\n');
        prompt(session, 'New handle: ');
        return;
      }
      this.state.handle = input;
      this.state.step = 'newPassword';
      session.setMode('line', false);
      session.writeAnsi('\r\n');
      prompt(session, 'New password: ');
      return;
    }

    if (this.state.step === 'newPassword') {
      if (!input) {
        prompt(session, 'New password: ');
        return;
      }
      const passwordHash = await hashPassword(input);
      const user = await session.prisma.user.create({
        data: {
          handle: this.state.handle,
          passwordHash,
          role: 'USER'
        }
      });
      await session.loginUser(user);
      session.writeAnsi('\r\n\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Account created. Logging in...') + '\r\n');
      const { MainMenuModule } = await import('./MainMenuModule.mjs');
      await session.goto(new MainMenuModule());
      return;
    }

    if (this.state.step === 'password') {
      const user = await session.prisma.user.findUnique({ where: { id: this.state.userId } });
      if (!user) {
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, 'Login failed.') + '\r\n');
        await this.enter(session);
        return;
      }
      const ok = await verifyPassword(input, user.passwordHash);
      if (!ok) {
        session.writeAnsi('\r\n\r\n' + c(ANSI.FG_BRIGHT_RED, 'Bad password.') + '\r\n\r\n');
        this.state.step = 'handle';
        session.setMode('line', true);
        prompt(session, 'Handle: ');
        return;
      }

      await session.loginUser(user);
      session.writeAnsi('\r\n\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Login ok.') + '\r\n');
      const { MainMenuModule } = await import('./MainMenuModule.mjs');
      await session.goto(new MainMenuModule());
      return;
    }
  }
}
