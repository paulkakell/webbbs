import { ANSI, c, hr, padRight } from '../../lib/ansi.mjs';
import { formatBytes, leechRating } from '../../lib/format.mjs';
import { printHeader, prompt, upper, isBack } from './_common.mjs';

export class FilesModule {
  constructor() {
    this.state = {
      stage: 'areas',
      areas: [],
      area: null,
      files: [],
      pendingUpload: null
    };
  }

  async enter(session) {
    if (!session.user) {
      const { LoginModule } = await import('./LoginModule.mjs');
      await session.goto(new LoginModule());
      return;
    }
    await this.showAreas(session);
  }

  async showAreas(session) {
    printHeader(session, 'File Areas');

    const areas = await session.prisma.fileArea.findMany({ orderBy: { createdAt: 'asc' } });
    this.state.stage = 'areas';
    this.state.areas = areas;

    if (areas.length === 0) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_RED, 'No file areas configured.') + '\r\n\r\n');
    } else {
      session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Areas:') + '\r\n');
      session.writeAnsi(hr(78));
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
      session.writeAnsi(hr(78));
    }

    session.writeAnsi('\r\n');
    prompt(session, 'Select area #, or B to return: ');
    session.setMode('line', true);
  }

  async showFiles(session, area) {
    printHeader(session, `Files: ${area.name}`);

    const files = await session.prisma.fileEntry.findMany({
      where: { areaId: area.id },
      orderBy: { uploadedAt: 'desc' },
      take: 100,
      include: { uploader: true }
    });

    this.state.stage = 'files';
    this.state.area = area;
    this.state.files = files;

    const rating = leechRating(session.user.uploadBytes, session.user.downloadBytes);

    session.writeAnsi(
      c(ANSI.FG_BRIGHT_WHITE, 'Leech: ') +
        c(ANSI.FG_BRIGHT_MAGENTA, rating.label) +
        c(ANSI.FG_BRIGHT_BLACK, ` (min ratio ${session.config?.minUploadDownloadRatio ?? 0})`) +
        '\r\n'
    );
    session.writeAnsi(hr(78));

    if (files.length === 0) {
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, 'No files yet.') + '\r\n');
    } else {
      files.forEach((f, idx) => {
        const n = String(idx + 1).padStart(3, ' ');
        const size = formatBytes(f.sizeBytes);
        const free = (area.freeLeech || f.freeLeech) ? c(ANSI.FG_BRIGHT_GREEN, 'FREE') : '';
        session.writeAnsi(
          c(ANSI.FG_BRIGHT_YELLOW, n) +
            ' ' +
            c(ANSI.FG_BRIGHT_CYAN, padRight(f.filename, 30)) +
            ' ' +
            c(ANSI.FG_BRIGHT_WHITE, padRight(size, 10)) +
            ' ' +
            c(ANSI.FG_BRIGHT_BLACK, padRight(f.uploader?.handle || '?', 10)) +
            (free ? ' ' + free : '') +
            '\r\n'
        );
      });
    }

    session.writeAnsi(hr(78));
    session.writeAnsi('\r\n');
    session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Commands: ') +
      c(ANSI.FG_BRIGHT_YELLOW, 'D #') + ' download, ' +
      c(ANSI.FG_BRIGHT_YELLOW, 'U') + ' upload, ' +
      c(ANSI.FG_BRIGHT_YELLOW, 'I #') + ' info, ' +
      c(ANSI.FG_BRIGHT_YELLOW, 'B') + ' back\r\n');
    prompt(session, 'Command: ');
    session.setMode('line', true);
  }

  canDownload(session) {
    const cfg = session.config;
    const min = Number(cfg?.minUploadDownloadRatio ?? 0);
    if (!Number.isFinite(min) || min <= 0) return { ok: true };

    const up = session.user.uploadBytes ?? 0n;
    const down = session.user.downloadBytes ?? 0n;
    if (down === 0n) return { ok: true };

    const ratio = Number(up) / Number(down);
    if (Number.isFinite(ratio) && ratio >= min) return { ok: true };

    return {
      ok: false,
      reason: `Ratio too low. Upload more before downloading (min ${min}).`
    };
  }

  parseIndexArg(s) {
    const m = String(s || '').trim().match(/^(?:[A-Za-z]\s*)?(\d+)$/);
    if (!m) return null;
    return Number.parseInt(m[1], 10);
  }

  async onLine(session, line) {
    const input = String(line || '').trim();

    if (this.state.stage === 'areas') {
      if (isBack(input)) {
        const { MainMenuModule } = await import('./MainMenuModule.mjs');
        await session.goto(new MainMenuModule());
        return;
      }
      const n = Number.parseInt(input, 10);
      if (!Number.isFinite(n) || n < 1 || n > this.state.areas.length) {
        session.bell();
        prompt(session, 'Select area #, or B to return: ');
        return;
      }
      const area = this.state.areas[n - 1];
      await this.showFiles(session, area);
      return;
    }

    if (this.state.stage === 'files') {
      if (isBack(input)) {
        await this.showAreas(session);
        return;
      }

      const up = upper(input);

      if (up === 'U' || up === 'UPLOAD') {
        this.state.stage = 'uploadDesc';
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_CYAN, 'Upload') + '\r\n');
        session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Enter a short description (or blank).') + '\r\n');
        prompt(session, 'Description: ');
        session.setMode('line', true);
        return;
      }

      if (up.startsWith('I')) {
        const idx = this.parseIndexArg(input.replace(/^I\s*/i, ''));
        if (!idx || idx < 1 || idx > this.state.files.length) {
          session.bell();
          prompt(session, 'Command: ');
          return;
        }
        const f = this.state.files[idx - 1];
        printHeader(session, `File Info: ${f.filename}`);
        session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Filename: ') + c(ANSI.FG_BRIGHT_CYAN, f.filename) + '\r\n');
        session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Size:     ') + c(ANSI.FG_BRIGHT_WHITE, formatBytes(f.sizeBytes)) + '\r\n');
        session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Uploader: ') + c(ANSI.FG_BRIGHT_YELLOW, f.uploader?.handle || '?') + '\r\n');
        session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'Uploaded: ') + c(ANSI.FG_BRIGHT_WHITE, new Date(f.uploadedAt).toLocaleString()) + '\r\n');
        session.writeAnsi(c(ANSI.FG_BRIGHT_WHITE, 'SHA256:   ') + c(ANSI.FG_BRIGHT_BLACK, f.sha256) + '\r\n');
        session.writeAnsi(hr(78));
        session.writeAnsi((f.description || '').replace(/\n/g, '\r\n') + '\r\n');
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Press any key to return...'));
        this.state.stage = 'info';
        session.setMode('key', true);
        return;
      }

      if (up.startsWith('D')) {
        const idx = this.parseIndexArg(input.replace(/^D\s*/i, ''));
        if (!idx || idx < 1 || idx > this.state.files.length) {
          session.bell();
          prompt(session, 'Command: ');
          return;
        }
        const f = this.state.files[idx - 1];

        // ratio check unless freeleech
        const free = this.state.area.freeLeech || f.freeLeech;
        if (!free) {
          const check = this.canDownload(session);
          if (!check.ok) {
            session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, check.reason) + '\r\n');
            prompt(session, 'Command: ');
            return;
          }
        }

        const token = session.transferTokens.create({
          kind: 'download',
          sessionId: session.id,
          userId: session.user.id,
          fileId: f.id
        }, 60_000);

        const url = `${session.baseUrl}/api/transfer/download/${encodeURIComponent(f.id)}?token=${encodeURIComponent(token)}`;
        session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, `Starting download: ${f.filename}`) + '\r\n');
        session.send({ type: 'action', action: 'download', url, filename: f.filename });
        prompt(session, 'Command: ');
        return;
      }

      session.bell();
      prompt(session, 'Command: ');
      return;
    }

    if (this.state.stage === 'uploadDesc') {
      // Create one-time upload token; client will open a file picker and POST multipart to upload URL.
      const desc = String(input || '').trim();
      const token = session.transferTokens.create({
        kind: 'upload',
        sessionId: session.id,
        userId: session.user.id,
        areaId: this.state.area.id,
        description: desc
      }, 120_000);

      const url = `${session.baseUrl}/api/transfer/upload?token=${encodeURIComponent(token)}`;

      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_WHITE, 'Select a file in your browser to upload...') + '\r\n');
      session.send({ type: 'action', action: 'uploadPrompt', url });
      session.writeAnsi(c(ANSI.FG_BRIGHT_BLACK, '(If nothing happens, check popup/file-picker permissions.)') + '\r\n');
      this.state.stage = 'files';
      prompt(session, 'Command: ');
      session.setMode('line', true);
      return;
    }
  }

  async onKey(session, _key) {
    if (this.state.stage === 'info') {
      await this.showFiles(session, this.state.area);
    }
  }

  async onUploadResult(session, msg) {
    // Client tells us upload result; refresh listing.
    if (msg?.ok) {
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_GREEN, 'Upload complete.') + '\r\n');
    } else {
      session.writeAnsi('\r\n' + c(ANSI.FG_BRIGHT_RED, `Upload failed: ${msg?.error || 'unknown error'}`) + '\r\n');
    }

    // Refresh user stats from DB (uploadBytes updated by server)
    try {
      const u = await session.prisma.user.findUnique({ where: { id: session.user.id } });
      if (u) session.user = u;
    } catch {}

    if (this.state.area) {
      await this.showFiles(session, this.state.area);
    } else {
      await this.showAreas(session);
    }
  }
}
