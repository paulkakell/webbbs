export const ANSI = {
  ESC: '\x1b',
  RESET: '\x1b[0m',
  CLEAR: '\x1b[2J\x1b[H',
  HOME: '\x1b[H',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERLINE: '\x1b[4m',
  BLINK: '\x1b[5m',
  REVERSE: '\x1b[7m',

  FG_BLACK: '\x1b[30m',
  FG_RED: '\x1b[31m',
  FG_GREEN: '\x1b[32m',
  FG_YELLOW: '\x1b[33m',
  FG_BLUE: '\x1b[34m',
  FG_MAGENTA: '\x1b[35m',
  FG_CYAN: '\x1b[36m',
  FG_WHITE: '\x1b[37m',

  FG_BRIGHT_BLACK: '\x1b[90m',
  FG_BRIGHT_RED: '\x1b[91m',
  FG_BRIGHT_GREEN: '\x1b[92m',
  FG_BRIGHT_YELLOW: '\x1b[93m',
  FG_BRIGHT_BLUE: '\x1b[94m',
  FG_BRIGHT_MAGENTA: '\x1b[95m',
  FG_BRIGHT_CYAN: '\x1b[96m',
  FG_BRIGHT_WHITE: '\x1b[97m',
};

export function c(code, text) {
  return `${code}${text}${ANSI.RESET}`;
}

export function hr(width = 78, ch = '-') {
  return ch.repeat(width) + '\r\n';
}

export function padRight(s, n) {
  const str = String(s);
  if (str.length >= n) return str;
  return str + ' '.repeat(n - str.length);
}

export function padLeft(s, n) {
  const str = String(s);
  if (str.length >= n) return str;
  return ' '.repeat(n - str.length) + str;
}
