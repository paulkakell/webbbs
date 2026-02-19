import { ANSI, c } from '../../src/lib/ansi.mjs';
import { printHeader, prompt, isBack, upper } from '../../src/bbs/modules/_common.mjs';

class GuessNumberDoorModule {
  constructor(opts) {
    this.onExit = opts?.onExit;
    this.state = {
      target: 1 + Math.floor(Math.random() * 100),
      guesses: 0,
      stage: 'guess'
    };
  }

  async enter(session) {
    printHeader(session, 'Door: Guess The Number');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Guess a number from 1 to 100.') + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Type Q to quit.') + '\r\n\r\n');
    prompt(session, 'Guess (1-100): ');
    session.setMode('line', true);
    this.state.stage = 'guess';
  }

  async onLine(session, line) {
    const input = String(line || '').trim();

    if (isBack(input) || upper(input) === 'Q') {
      await this.exit(session);
      return;
    }

    const n = Number.parseInt(input, 10);
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      session.bell();
      prompt(session, 'Guess (1-100): ');
      return;
    }

    this.state.guesses++;

    if (n < this.state.target) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, 'Too low.') + '\r\n');
      prompt(session, 'Guess (1-100): ');
      return;
    }

    if (n > this.state.target) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_YELLOW, 'Too high.') + '\r\n');
      prompt(session, 'Guess (1-100): ');
      return;
    }

    session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, `Correct! You got it in ${this.state.guesses} guesses.`) + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_GREEN, 'Press any key to return to Doors...') + '\r\n');
    session.setMode('key', true);
    this.state.stage = 'done';
  }

  async onKey(session, _key) {
    if (this.state.stage === 'done') {
      await this.exit(session);
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
  doorId: 'guess-number',
  name: 'Guess The Number',
  description: 'A classic number guessing game.',
  type: 'INTERNAL',
  async createModule(opts) {
    return new GuessNumberDoorModule(opts);
  }
};
