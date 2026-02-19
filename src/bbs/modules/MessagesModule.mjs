import { ANSI, c, hr, padRight } from '../../lib/ansi.mjs';
import { printHeader, prompt, upper, isBack } from './_common.mjs';

export class MessagesModule {
  constructor() {
    this.state = {
      stage: 'boards',
      boards: [],
      board: null,
      threads: [],
      thread: null,
      compose: null,
      buffer: []
    };
  }

  async enter(session) {
    if (!session.user) {
      const { LoginModule } = await import('./LoginModule.mjs');
      await session.goto(new LoginModule());
      return;
    }
    await this.showBoards(session);
  }

  async showBoards(session) {
    printHeader(session, 'Message Boards');

    const boards = await session.prisma.board.findMany({ orderBy: { createdAt: 'asc' } });
    this.state.boards = boards;
    this.state.stage = 'boards';

    if (boards.length === 0) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_RED, 'No boards configured.') + '\r\n\r\n');
    } else {
      session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Boards:') + '\r\n');
      session.writeAnsi(hr(78));
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
      session.writeAnsi(hr(78));
    }

    session.writeAnsi('\r\n');
    prompt(session, 'Select board #, or B to return: ');
    session.setMode('line', true);
  }

  async showThreads(session, board) {
    printHeader(session, `Board: ${board.name}`);

    const threads = await session.prisma.thread.findMany({
      where: { boardId: board.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { createdBy: true, posts: { select: { id: true } } }
    });

    this.state.stage = 'threads';
    this.state.board = board;
    this.state.threads = threads;

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Threads (latest 50):') + '\r\n');
    session.writeAnsi(hr(78));

    if (threads.length === 0) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, 'No threads yet.') + '\r\n');
    } else {
      threads.forEach((t, idx) => {
        const n = String(idx + 1).padStart(2, ' ');
        const posts = t.posts?.length ?? 0;
        session.writeAnsi(
          c(ANSI.FG_BRIGHT_YELLOW, n) +
            ' ' +
            c(ANSI.FG_BRIGHT_CYAN, padRight(t.subject, 40)) +
            ' ' +
            c(ANSI.FG_BRIGHT_BLACK, padRight(t.createdBy?.handle || '?', 10)) +
            ' ' +
            c(ANSI.FG_BRIGHT_BLACK, String(posts).padStart(3, ' ')) +
            '\r\n'
        );
      });
    }

    session.writeAnsi(hr(78));
    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Enter thread # to read, ') + c(ANSI.FG_BRIGHT_YELLOW, 'N') + c(ANSI.FG_BRIGHT_WHITE, ' = new thread, B = back') + '\r\n');
    prompt(session, 'Selection: ');
    session.setMode('line', true);
  }

  async showThread(session, thread) {
    const posts = await session.prisma.post.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      include: { createdBy: true }
    });

    this.state.stage = 'read';
    this.state.thread = thread;

    printHeader(session, `Thread: ${thread.subject}`);

    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, `Posts: ${posts.length}`) + '\r\n');
    session.writeAnsi(hr(78));

    for (const p of posts) {
      const when = new Date(p.createdAt).toLocaleString();
      session.writeAnsi(
        c(ANSI.FG_BRIGHT_YELLOW, p.createdBy?.handle || '?') +
          c(ANSI.FG_BRIGHT_BLACK, ` @ ${when}`) +
          '\r\n'
      );
      session.writeAnsi(p.body.replace(/\n/g, '\r\n') + '\r\n');
      session.writeAnsi(hr(78));
    }

    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'R = reply, B = back to thread list') + '\r\n');
    prompt(session, 'Command: ');
    session.setMode('key', true);
  }

  async startNewThread(session) {
    this.state.stage = 'newSubject';
    this.state.compose = { kind: 'newThread', subject: '', lines: [] };
    session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_CYAN, 'New thread') + '\r\n');
    prompt(session, 'Subject: ');
    session.setMode('line', true);
  }

  async startReply(session) {
    this.state.stage = 'replyBody';
    this.state.compose = { kind: 'reply', lines: [] };
    session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_CYAN, 'Reply') + '\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, "Enter message. End with a single '.' on its own line.") + '\r\n');
    prompt(session, '> ');
    session.setMode('line', true);
  }

  async onLine(session, line) {
    const input = String(line || '').trimEnd();

    if (this.state.stage === 'boards') {
      if (isBack(input)) {
        const { MainMenuModule } = await import('./MainMenuModule.mjs');
        await session.goto(new MainMenuModule());
        return;
      }
      const n = Number.parseInt(input, 10);
      if (!Number.isFinite(n) || n < 1 || n > this.state.boards.length) {
        session.bell();
        prompt(session, 'Select board #, or B to return: ');
        return;
      }
      const board = this.state.boards[n - 1];
      await this.showThreads(session, board);
      return;
    }

    if (this.state.stage === 'threads') {
      if (isBack(input)) {
        await this.showBoards(session);
        return;
      }
      if (upper(input) === 'N') {
        await this.startNewThread(session);
        return;
      }
      const n = Number.parseInt(input, 10);
      if (!Number.isFinite(n) || n < 1 || n > this.state.threads.length) {
        session.bell();
        prompt(session, 'Selection: ');
        return;
      }
      const thread = this.state.threads[n - 1];
      await this.showThread(session, thread);
      return;
    }

    if (this.state.stage === 'newSubject') {
      const subj = String(input || '').trim();
      if (!subj) {
        session.bell();
        prompt(session, 'Subject: ');
        return;
      }
      this.state.compose.subject = subj;
      this.state.stage = 'newBody';
      this.state.compose.lines = [];
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_WHITE, "Enter message. End with a single '.' on its own line.") + '\r\n');
      prompt(session, '> ');
      session.setMode('line', true);
      return;
    }

    if (this.state.stage === 'newBody') {
      if (input === '.') {
        const body = this.state.compose.lines.join('\n').trim();
        if (!body) {
          session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, 'Message is empty. Cancelled.') + '\r\n');
          await this.showThreads(session, this.state.board);
          return;
        }
        const thread = await session.prisma.thread.create({
          data: {
            boardId: this.state.board.id,
            subject: this.state.compose.subject,
            createdById: session.user.id,
            posts: {
              create: {
                createdById: session.user.id,
                body
              }
            }
          }
        });
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Posted.') + '\r\n');
        await this.showThread(session, thread);
        return;
      }
      this.state.compose.lines.push(input);
      prompt(session, '> ');
      return;
    }

    if (this.state.stage === 'replyBody') {
      if (input === '.') {
        const body = this.state.compose.lines.join('\n').trim();
        if (!body) {
          session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, 'Reply is empty. Cancelled.') + '\r\n');
          await this.showThread(session, this.state.thread);
          return;
        }
        await session.prisma.post.create({
          data: {
            threadId: this.state.thread.id,
            createdById: session.user.id,
            body
          }
        });
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Replied.') + '\r\n');
        const thread = await session.prisma.thread.findUnique({ where: { id: this.state.thread.id } });
        await this.showThread(session, thread);
        return;
      }
      this.state.compose.lines.push(input);
      prompt(session, '> ');
      return;
    }
  }

  async onKey(session, key) {
    const k = String(key || '').toUpperCase();

    if (this.state.stage === 'read') {
      if (k === 'B') {
        await this.showThreads(session, this.state.board);
        return;
      }
      if (k === 'R') {
        await this.startReply(session);
        return;
      }
      // ignore
    }
  }
}
