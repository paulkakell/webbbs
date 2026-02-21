import { randomUUID } from 'node:crypto';
import { ANSI } from '../lib/ansi.mjs';

export class BbsSession {
  /**
   * @param {{
   *  socket: any,
   *  prisma: any,
   *  config: any,
   *  doorRegistry: Map<string, any>,
   *  doorDb: { listInstalledEnabled: () => Promise<any[]> },
   *  transferTokens: any,
   *  dataDir: string,
   *  baseUrl: string,
   * }} opts
   */
  constructor(opts) {
    this.id = randomUUID();
    this.socket = opts.socket;
    this.prisma = opts.prisma;
    this.config = opts.config;
    this.doorRegistry = opts.doorRegistry;
    this.doorDb = opts.doorDb;
    this.transferTokens = opts.transferTokens;
    this.dataDir = opts.dataDir;
    this.baseUrl = opts.baseUrl;

    this.user = null;
    this.currentModule = null;
    this.mode = { mode: 'key', echo: true };

    this.alive = true;

    // Heartbeat/cleanup
    this._cleanupInterval = setInterval(() => {
      try {
        this.transferTokens.cleanup();
      } catch {}
    }, 30_000);
  }

  dispose() {
    this.alive = false;
    clearInterval(this._cleanupInterval);
  }

  send(obj) {
    if (!this.alive) return;
    try {
      this.socket.send(JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  writeAnsi(data) {
    this.send({ type: 'ansi', data });
  }

  clear() {
    this.writeAnsi(ANSI.CLEAR);
  }

  bell() {
    this.writeAnsi('\x07');
  }

  setMode(mode, echo = true) {
    this.mode = { mode, echo };
    this.send({ type: 'mode', mode, echo });
  }

  async refreshConfig() {
    const cfg = await this.prisma.bbsConfig.findUnique({ where: { id: 1 } });
    if (cfg) this.config = cfg;
    return this.config;
  }

  async loginUser(user) {
    this.user = user;
    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    } catch {}
  }

  async logout() {
    this.user = null;
  }

  async goto(module) {
    this.currentModule = module;
    if (module?.enter) {
      await module.enter(this);
    }
  }

  async handleClientMessage(msg) {
    if (!this.currentModule) return;

    if (msg.type === 'key') {
      if (this.currentModule.onKey) {
        await this.currentModule.onKey(this, String(msg.key || ''));
      }
      return;
    }

    if (msg.type === 'line') {
      if (this.currentModule.onLine) {
        await this.currentModule.onLine(this, String(msg.line || ''));
      }
      return;
    }

    if (msg.type === 'uploadResult') {
      if (this.currentModule.onUploadResult) {
        await this.currentModule.onUploadResult(this, msg);
      }
      return;
    }
  }

  async listEnabledDoors() {
    const rows = await this.doorDb.listInstalledEnabled();
    return rows;
  }
}
