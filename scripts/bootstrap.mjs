import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSOP_HANDLE = (process.env.SYSOP_HANDLE || 'sysop').trim();
const SYSOP_PASSWORD = (process.env.SYSOP_PASSWORD || 'change-me').trim();
const allowRegistrationEnv = String(process.env.ALLOW_REGISTRATION || 'true').toLowerCase();
const allowRegistration = allowRegistrationEnv === 'true' || allowRegistrationEnv === '1' || allowRegistrationEnv === 'yes';

async function ensureConfig() {
  const existing = await prisma.bbsConfig.findUnique({ where: { id: 1 } });
  if (!existing) {
    await prisma.bbsConfig.create({
      data: {
        id: 1,
        bbsName: 'webBBS',
        motd: 'Welcome to webBBS!\r\n',
        allowRegistration,
        minUploadDownloadRatio: 0.25
      }
    });
    console.log('Created default BBS config');
  } else {
    // Keep existing values, but allow env to toggle registration without requiring file edits.
    if (existing.allowRegistration !== allowRegistration) {
      await prisma.bbsConfig.update({
        where: { id: 1 },
        data: { allowRegistration }
      });
      console.log(`Updated allowRegistration=${allowRegistration}`);
    }
  }
}

async function ensureSysop() {
  const user = await prisma.user.findUnique({ where: { handle: SYSOP_HANDLE } });
  if (!user) {
    const passwordHash = await bcrypt.hash(SYSOP_PASSWORD, 12);
    await prisma.user.create({
      data: {
        handle: SYSOP_HANDLE,
        passwordHash,
        role: 'SYSOP'
      }
    });
    console.log(`Created sysop user '${SYSOP_HANDLE}'`);
  } else {
    if (user.role !== 'SYSOP' && user.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'SYSOP' } });
      console.log(`Upgraded '${SYSOP_HANDLE}' to SYSOP`);
    }
    console.log(`Sysop user '${SYSOP_HANDLE}' already exists (password unchanged)`);
  }
}

async function seedDefaults() {
  const boardCount = await prisma.board.count();
  if (boardCount === 0) {
    await prisma.board.create({ data: { name: 'General', description: 'General discussion' } });
    console.log('Seeded default board');
  }

  const areaCount = await prisma.fileArea.count();
  if (areaCount === 0) {
    await prisma.fileArea.create({ data: { name: 'Main', description: 'Main file area', freeLeech: false } });
    console.log('Seeded default file area');
  }
}

async function syncDoorPackages() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const doorsDir = path.join(root, 'doors');
  if (!fs.existsSync(doorsDir)) return;

  const entries = fs.readdirSync(doorsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const d of entries) {
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
    } catch (e) {
      console.warn(`Failed to load door manifest: ${manifestPath}`);
    }
  }
}

try {
  await ensureConfig();
  await ensureSysop();
  await seedDefaults();
  await syncDoorPackages();
} finally {
  await prisma.$disconnect();
}
