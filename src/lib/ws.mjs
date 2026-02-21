/**
 * WebSocket Upgrade helpers.
 *
 * This module is intentionally dependency-free so it can be unit tested without
 * requiring a full Fastify/Prisma environment.
 */

/**
 * @param {unknown} v
 * @returns {string | undefined}
 */
function headerString(v) {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(',');
  return undefined;
}

/**
 * @param {Record<string, unknown>} headers
 * @param {string} name
 * @returns {string | undefined}
 */
function getHeader(headers, name) {
  if (!headers) return undefined;
  return headerString(headers[name.toLowerCase()]);
}

/**
 * Best-effort check whether a request includes a WebSocket upgrade.
 *
 * @param {Record<string, unknown>} headers
 * @returns {boolean}
 */
export function isWebSocketUpgradeRequest(headers) {
  const upgrade = (getHeader(headers, 'upgrade') || '').toLowerCase().trim();
  const connection = (getHeader(headers, 'connection') || '').toLowerCase();

  if (upgrade !== 'websocket') return false;

  // RFC 6455: Connection header may include multiple tokens, e.g. "keep-alive, Upgrade".
  const tokens = connection
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (!tokens.includes('upgrade')) return false;

  // Most clients also include sec-websocket-key, but do not require it here since
  // proxies can be weird; the two headers above are the primary signal.
  return true;
}

/**
 * @param {Record<string, unknown>} headers
 * @returns {string}
 */
export function wsUpgradeDebugSummary(headers) {
  const upgrade = getHeader(headers, 'upgrade') || '(missing)';
  const connection = getHeader(headers, 'connection') || '(missing)';
  const version = getHeader(headers, 'sec-websocket-version') || '(missing)';
  const key = getHeader(headers, 'sec-websocket-key');
  const xfp = getHeader(headers, 'x-forwarded-proto') || '(missing)';
  const xff = getHeader(headers, 'x-forwarded-for') || '(missing)';

  return [
    '[websocket-upgrade-debug]',
    `upgrade: ${upgrade}`,
    `connection: ${connection}`,
    `sec-websocket-version: ${version}`,
    `sec-websocket-key: ${key ? '(present)' : '(missing)'}`,
    `x-forwarded-proto: ${xfp}`,
    `x-forwarded-for: ${xff}`
  ].join('\n');
}
