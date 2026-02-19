import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const publicDir = path.join(root, 'public');
const vendorDir = path.join(publicDir, 'vendor');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log(`copied ${src} -> ${dst}`);
}

function tryCopy(src, dst) {
  if (!fs.existsSync(src)) {
    console.warn(`missing: ${src}`);
    return;
  }
  copyFile(src, dst);
}

ensureDir(vendorDir);

// xterm core
tryCopy(
  path.join(root, 'node_modules', 'xterm', 'lib', 'xterm.js'),
  path.join(vendorDir, 'xterm', 'xterm.js')
);
tryCopy(
  path.join(root, 'node_modules', 'xterm', 'css', 'xterm.css'),
  path.join(vendorDir, 'xterm', 'xterm.css')
);

// Fit addon
tryCopy(
  path.join(root, 'node_modules', 'xterm-addon-fit', 'lib', 'xterm-addon-fit.js'),
  path.join(vendorDir, 'xterm', 'xterm-addon-fit.js')
);
