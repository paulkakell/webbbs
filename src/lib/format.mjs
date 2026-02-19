export function formatBytes(bi) {
  try {
    const bytes = typeof bi === 'bigint' ? bi : BigInt(bi);
    const neg = bytes < 0n;
    const b = neg ? -bytes : bytes;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unit = 0;
    let value = Number(b);
    // If extremely large, Number may overflow; fall back to integer string.
    if (!Number.isFinite(value)) {
      return `${bytes.toString()} B`;
    }
    while (value >= 1024 && unit < units.length - 1) {
      value = value / 1024;
      unit++;
    }
    const formatted = unit === 0 ? String(Math.floor(value)) : value.toFixed(2);
    return `${neg ? '-' : ''}${formatted} ${units[unit]}`;
  } catch {
    return String(bi);
  }
}

export function ratio(uploadBytes, downloadBytes) {
  const up = typeof uploadBytes === 'bigint' ? uploadBytes : BigInt(uploadBytes || 0);
  const down = typeof downloadBytes === 'bigint' ? downloadBytes : BigInt(downloadBytes || 0);
  if (down === 0n) return null;
  // Return as JS number; acceptable for display.
  const r = Number(up) / Number(down);
  return Number.isFinite(r) ? r : null;
}

export function ratioString(uploadBytes, downloadBytes) {
  const r = ratio(uploadBytes, downloadBytes);
  if (r === null) {
    if ((typeof downloadBytes === 'bigint' ? downloadBytes : BigInt(downloadBytes || 0)) === 0n) return '∞';
    return 'n/a';
  }
  return r.toFixed(3);
}

export function leechRating(uploadBytes, downloadBytes) {
  const up = typeof uploadBytes === 'bigint' ? uploadBytes : BigInt(uploadBytes || 0);
  const down = typeof downloadBytes === 'bigint' ? downloadBytes : BigInt(downloadBytes || 0);
  if (down === 0n && up === 0n) return { label: 'New', score: 0 };
  if (down === 0n) return { label: 'Seeder', score: 5 };
  const r = ratio(up, down);
  if (r === null) return { label: 'n/a', score: 0 };
  if (r >= 1.0) return { label: 'Elite', score: 5 };
  if (r >= 0.5) return { label: 'Good', score: 4 };
  if (r >= 0.25) return { label: 'Fair', score: 3 };
  if (r >= 0.10) return { label: 'Leech', score: 2 };
  return { label: 'Vampire', score: 1 };
}

export function clampInt(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}
