import bcrypt from 'bcryptjs';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function isAdminRole(role) {
  return role === 'ADMIN' || role === 'SYSOP';
}

export async function createWebSession(prisma, userId, ttlDays) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  const session = await prisma.webSession.create({
    data: { userId, expiresAt }
  });
  return session;
}

export async function getUserFromWebSession(prisma, sessionId) {
  if (!sessionId) return null;
  const session = await prisma.webSession.findUnique({
    where: { id: sessionId },
    include: { user: true }
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    try {
      await prisma.webSession.delete({ where: { id: sessionId } });
    } catch {}
    return null;
  }
  return session.user;
}
