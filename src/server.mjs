import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import mime from 'mime-types';

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

import { createWebSession, getUserFromWebSession, isAdminRole, verifyPassword } from './lib/auth.mjs';
import { createTokenStore } from './lib/transferTokens.mjs';
import { BbsSession } from './bbs/BbsSession.mjs';
import { LoginModule } from './bbs/modules/LoginModule.mjs';
import { MainMenuModule } from './bbs/modules/MainMenuModule.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const prisma = new PrismaClient();

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);

// Ensure data directories
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

// In-memory state
const bbsSessions = new Map(); // sessionId -> BbsSession
const transferTokens = createTokenStore();

async function loadConfig() {
  const cfg = await prisma.bbsConfig.findUnique({ where: { id: 1 } });
  if (cfg) return cfg;
  // Fallback; bootstrap usually creates this.
  return await prisma.bbsConfig.create({
    data: {
      id: 1,
      bbsName: 'webBBS',
      motd: 'Welcome to webBBS!\n',
      allowRegistration: true,
      minUploadDownloadRatio: 0.25
    }
  });
}

async function syncDoorPackagesFromManifests() {
  const doorsDir = path.join(ROOT, 'doors');
  if (!fs.existsSync(doorsDir)) return;
  const dirs = fs.readdirSync(doorsDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const d of dirs) {
    const manifestPath = path.join(doorsDir, d.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!manifest.doorId) continue;
      await prisma.doorPackage.upsert({
        where: { doorId: manifest.doorId },
        update: {
          name: manifest.name || manifest.doorId,
          description: manifest.description || '',
          type: manifest.type === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL'
        },
        create: {
          doorId: manifest.doorId,
          name: manifest.name || manifest.doorId,
          description: manifest.description || '',
          type: manifest.type === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL',
          enabled: manifest.enabled !== false
        }
      });
    } catch {
      // ignore
    }
  }
}

async function loadDoorRegistry() {
  const registry = new Map();
  const doorsDir = path.join(ROOT, 'doors');
  if (!fs.existsSync(doorsDir)) return registry;

  const dirs = fs.readdirSync(doorsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const d of dirs) {
    const doorPath = path.join(doorsDir, d.name, 'door.mjs');
    if (!fs.existsSync(doorPath)) continue;
    try {
      const mod = await import(pathToFileURL(doorPath).href);
      if (mod?.door?.doorId) {
        registry.set(mod.door.doorId, mod.door);
      }
    } catch (e) {
      console.warn(`Failed to load door: ${doorPath}`);
    }
  }
  return registry;
}

let doorRegistry = await loadDoorRegistry();

const fastify = Fastify({
  logger: true
});

fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET || undefined
});
fastify.register(formbody);
fastify.register(multipart, {
  limits: {
    fileSize: 1024 * 1024 * 100 // 100MB
  }
});
fastify.register(websocket);

fastify.register(staticPlugin, {
  root: path.join(ROOT, 'public'),
  prefix: '/',
  decorateReply: true
});

fastify.decorateRequest('user', null);

async function authUserFromCookie(req) {
  const sid = req.cookies?.bbs_session;
  if (!sid) return null;
  return await getUserFromWebSession(prisma, sid);
}

async function requireAdmin(req, reply) {
  const user = await authUserFromCookie(req);
  if (!user) {
    reply.code(401).send({ error: 'Not logged in' });
    return null;
  }
  if (!isAdminRole(user.role)) {
    reply.code(403).send({ error: 'Forbidden' });
    return null;
  }
  req.user = user;
  return user;
}

// Convenience routes
fastify.get('/', async (_req, reply) => {
  reply.redirect('/bbs');
});

fastify.get('/bbs', async (_req, reply) => {
  return reply.sendFile('bbs.html');
});

fastify.get('/admin', async (req, reply) => {
  const user = await authUserFromCookie(req);
  if (!user || !isAdminRole(user.role)) {
    return reply.redirect('/admin/login.html');
  }
  return reply.sendFile('admin/index.html');
});

fastify.get('/admin/login', async (_req, reply) => {
  return reply.redirect('/admin/login.html');
});

// Auth API
const LoginBody = z.object({
  handle: z.string().min(1).max(64),
  password: z.string().min(1).max(256)
});

fastify.post('/api/auth/login', async (req, reply) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    reply.code(400).send({ error: 'Invalid payload' });
    return;
  }
  const { handle, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { handle } });
  if (!user) {
    reply.code(401).send({ error: 'Invalid credentials' });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    reply.code(401).send({ error: 'Invalid credentials' });
    return;
  }

  const sess = await createWebSession(prisma, user.id, SESSION_TTL_DAYS);
  reply.setCookie('bbs_session', sess.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: sess.expiresAt
  });

  reply.send({ ok: true, handle: user.handle, role: user.role });
});

fastify.post('/api/auth/logout', async (req, reply) => {
  const sid = req.cookies?.bbs_session;
  if (sid) {
    try {
      await prisma.webSession.delete({ where: { id: sid } });
    } catch {}
  }
  reply.clearCookie('bbs_session', { path: '/' });
  reply.send({ ok: true });
});

fastify.get('/api/auth/me', async (req, reply) => {
  const user = await authUserFromCookie(req);
  if (!user) {
    reply.code(401).send({ error: 'Not logged in' });
    return;
  }
  reply.send({ id: user.id, handle: user.handle, role: user.role });
});

// Admin API
fastify.get('/api/admin/config', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  const cfg = await loadConfig();
  reply.send(cfg);
});

const ConfigBody = z.object({
  bbsName: z.string().min(1).max(128),
  motd: z.string().max(4000),
  allowRegistration: z.boolean(),
  minUploadDownloadRatio: z.number().min(0).max(100)
});

fastify.put('/api/admin/config', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  const parsed = ConfigBody.safeParse(req.body);
  if (!parsed.success) {
    reply.code(400).send({ error: 'Invalid payload' });
    return;
  }

  const updated = await prisma.bbsConfig.update({
    where: { id: 1 },
    data: parsed.data
  });
  reply.send(updated);
});

fastify.get('/api/admin/boards', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;
  const boards = await prisma.board.findMany({ orderBy: { createdAt: 'asc' } });
  reply.send(boards);
});

const BoardBody = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional().default('')
});

fastify.post('/api/admin/boards', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  const parsed = BoardBody.safeParse(req.body);
  if (!parsed.success) {
    reply.code(400).send({ error: 'Invalid payload' });
    return;
  }

  const created = await prisma.board.create({ data: parsed.data });
  reply.send(created);
});

fastify.delete('/api/admin/boards/:id', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  const id = String(req.params.id);
  await prisma.board.delete({ where: { id } });
  reply.send({ ok: true });
});

fastify.get('/api/admin/file-areas', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;
  const areas = await prisma.fileArea.findMany({ orderBy: { createdAt: 'asc' } });
  reply.send(areas);
});

const AreaBody = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional().default(''),
  freeLeech: z.boolean().optional().default(false)
});

fastify.post('/api/admin/file-areas', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  const parsed = AreaBody.safeParse(req.body);
  if (!parsed.success) {
    reply.code(400).send({ error: 'Invalid payload' });
    return;
  }

  const created = await prisma.fileArea.create({ data: parsed.data });
  reply.send(created);
});

fastify.put('/api/admin/file-areas/:id', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  const id = String(req.params.id);
  const body = z.object({
    name: z.string().min(1).max(128).optional(),
    description: z.string().max(512).optional(),
    freeLeech: z.boolean().optional()
  }).safeParse(req.body);

  if (!body.success) {
    reply.code(400).send({ error: 'Invalid payload' });
    return;
  }

  const updated = await prisma.fileArea.update({ where: { id }, data: body.data });
  reply.send(updated);
});

fastify.delete('/api/admin/file-areas/:id', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  const id = String(req.params.id);
  await prisma.fileArea.delete({ where: { id } });
  reply.send({ ok: true });
});

fastify.get('/api/admin/doors', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  // Optionally resync manifests each time; cheap.
  await syncDoorPackagesFromManifests();

  const doors = await prisma.doorPackage.findMany({ orderBy: { name: 'asc' } });
  reply.send(doors);
});

fastify.put('/api/admin/doors/:id', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  const id = String(req.params.id);
  const body = z.object({ enabled: z.boolean() }).safeParse(req.body);
  if (!body.success) {
    reply.code(400).send({ error: 'Invalid payload' });
    return;
  }

  const updated = await prisma.doorPackage.update({ where: { id }, data: { enabled: body.data.enabled } });
  reply.send(updated);
});

fastify.post('/api/admin/doors/rescan', async (req, reply) => {
  const user = await requireAdmin(req, reply);
  if (!user) return;

  await syncDoorPackagesFromManifests();
  doorRegistry = await loadDoorRegistry();
  reply.send({ ok: true, loaded: doorRegistry.size });
});

// Transfer endpoints used by the BBS client (one-time tokens)
fastify.post('/api/transfer/upload', async (req, reply) => {
  const token = String(req.query?.token || '');
  const entry = transferTokens.consume(token);
  if (!entry || entry.kind !== 'upload') {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return;
  }

  const areaId = entry.areaId;
  const userId = entry.userId;
  if (!areaId || !userId) {
    reply.code(400).send({ error: 'Bad token' });
    return;
  }

  const area = await prisma.fileArea.findUnique({ where: { id: areaId } });
  if (!area) {
    reply.code(404).send({ error: 'Area not found' });
    return;
  }

  const part = await req.file();
  if (!part) {
    reply.code(400).send({ error: 'No file' });
    return;
  }

  const originalName = part.filename || 'upload.bin';
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const fileId = crypto.randomUUID();
  const areaDir = path.join(DATA_DIR, 'uploads', areaId);
  fs.mkdirSync(areaDir, { recursive: true });

  const storagePath = path.join(areaDir, `${fileId}_${safeName}`);
  const hash = crypto.createHash('sha256');
  let bytes = 0n;

  const writeStream = fs.createWriteStream(storagePath);
  part.file.on('data', (chunk) => {
    hash.update(chunk);
    bytes += BigInt(chunk.length);
  });

  try {
    await pipeline(part.file, writeStream);
  } catch (e) {
    try { fs.unlinkSync(storagePath); } catch {}
    reply.code(500).send({ error: 'Failed to save file' });
    return;
  }

  const sha256 = hash.digest('hex');

  const rel = path.relative(DATA_DIR, storagePath);
  const description = String(entry.description || '').slice(0, 512);

  await prisma.fileEntry.create({
    data: {
      id: fileId,
      areaId,
      filename: safeName,
      description,
      sizeBytes: bytes,
      sha256,
      storagePath: rel,
      uploaderId: userId,
      freeLeech: false
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { uploadBytes: { increment: bytes } }
  });

  reply.send({ ok: true, id: fileId, filename: safeName, bytes: bytes.toString() });
});

fastify.get('/api/transfer/download/:fileId', async (req, reply) => {
  const token = String(req.query?.token || '');
  const entry = transferTokens.peek(token);
  if (!entry || entry.kind !== 'download') {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return;
  }

  const fileId = String(req.params.fileId);
  if (entry.fileId !== fileId) {
    reply.code(403).send({ error: 'Token does not match file' });
    return;
  }

  const file = await prisma.fileEntry.findUnique({
    where: { id: fileId },
    include: { area: true }
  });

  if (!file) {
    reply.code(404).send({ error: 'Not found' });
    return;
  }

  // Enforce ratio unless freeleech.
  const free = file.freeLeech || file.area.freeLeech;
  const cfg = await loadConfig();

  if (!free) {
    const user = await prisma.user.findUnique({ where: { id: entry.userId } });
    if (!user) {
      reply.code(401).send({ error: 'Invalid user' });
      return;
    }

    const min = Number(cfg?.minUploadDownloadRatio ?? 0);
    if (min > 0 && user.downloadBytes > 0n) {
      const ratio = Number(user.uploadBytes) / Number(user.downloadBytes);
      if (!Number.isFinite(ratio) || ratio < min) {
        reply.code(403).send({ error: `Ratio too low (min ${min}).` });
        return;
      }
    }

    // Count download and log
    await prisma.user.update({
      where: { id: user.id },
      data: { downloadBytes: { increment: file.sizeBytes } }
    });

    await prisma.downloadLog.create({
      data: {
        fileId: file.id,
        userId: user.id,
        bytes: file.sizeBytes
      }
    });
  }

  const absPath = path.join(DATA_DIR, file.storagePath);
  if (!fs.existsSync(absPath)) {
    reply.code(500).send({ error: 'File missing on disk' });
    return;
  }

  const contentType = mime.lookup(file.filename) || 'application/octet-stream';
  reply.header('Content-Type', contentType);
  reply.header('Content-Disposition', `attachment; filename="${file.filename}"`);

  const stream = fs.createReadStream(absPath);
  reply.send(stream);
});

// WebSocket: BBS sessions
fastify.get('/ws/bbs', { websocket: true }, async (conn, req) => {
  const cfg = await loadConfig();

  const doorDb = {
    async listInstalledEnabled() {
      return prisma.doorPackage.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } });
    }
  };

  const session = new BbsSession({
    conn,
    prisma,
    config: cfg,
    doorRegistry,
    doorDb,
    transferTokens,
    dataDir: DATA_DIR,
    baseUrl: ''
  });

  bbsSessions.set(session.id, session);

  // If cookie session exists, auto-login.
  try {
    const cookieUser = await authUserFromCookie(req);
    if (cookieUser) {
      await session.loginUser(cookieUser);
      await session.goto(new MainMenuModule());
    } else {
      await session.goto(new LoginModule());
    }
  } catch {
    await session.goto(new LoginModule());
  }

  conn.socket.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch {
      return;
    }
    try {
      await session.handleClientMessage(msg);
    } catch (e) {
      // Basic safety: keep session alive even if a module throws.
      try {
        session.writeAnsi('\r\n\r\n[error]\r\n');
      } catch {}
    }
  });

  conn.socket.on('close', () => {
    bbsSessions.delete(session.id);
    session.dispose();
  });
});

// Start
await syncDoorPackagesFromManifests();

doorRegistry = await loadDoorRegistry();

fastify.listen({ port: PORT, host: '0.0.0.0' });
