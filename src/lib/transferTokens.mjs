import { randomUUID } from 'node:crypto';

export function createTokenStore() {
  /** @type {Map<string, {kind: string, sessionId: string, userId?: string, fileId?: string, areaId?: string, expiresAt: number}>} */
  const tokens = new Map();

  function create(entry, ttlMs = 60_000) {
    const token = randomUUID();
    tokens.set(token, {
      ...entry,
      expiresAt: Date.now() + ttlMs
    });
    return token;
  }

  function peek(token) {
    const entry = tokens.get(token);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      tokens.delete(token);
      return null;
    }
    return entry;
  }

  function consume(token) {
    const entry = peek(token);
    if (!entry) return null;
    tokens.delete(token);
    return entry;
  }

  function cleanup() {
    const now = Date.now();
    for (const [k, v] of tokens.entries()) {
      if (v.expiresAt < now) tokens.delete(k);
    }
  }

  return { create, peek, consume, cleanup };
}
