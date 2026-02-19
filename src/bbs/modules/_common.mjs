import { ANSI, c, hr } from '../../lib/ansi.mjs';

export function printHeader(session, title) {
  const name = session.config?.bbsName || 'webBBS';
  session.writeAnsi(ANSI.CLEAR);
  session.writeAnsi(c(ANSI.FG_BRIGHT_CYAN, `${name}`) + '  ' + c(ANSI.FG_BRIGHT_WHITE, title) + '\r\n');
  session.writeAnsi(hr(78));
}

export function prompt(session, text) {
  session.writeAnsi(c(ANSI.FG_BRIGHT_GREEN, text));
}

export function normalizeCommand(s) {
  return String(s || '').trim();
}

export function upper(s) {
  return String(s || '').trim().toUpperCase();
}

export function isBack(cmd) {
  const c = upper(cmd);
  return c === 'B' || c === 'BACK' || c === 'Q' || c === 'QUIT' || c === 'EXIT';
}
