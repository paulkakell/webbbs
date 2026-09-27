import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, extname, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Validate an already-built Jekyll artifact without fetching external URLs. */
export function verifyPages(directory, baseurl = '/webbbs') {
  const root = resolve(directory);
  const files = [];
  const forbidden = /(^|\/)(?:\.[^/]+|src|scripts|test|tests|prisma|node_modules|doors|public)(\/|$)|\.(?:mjs|prisma|env|ya?ml)$/i;
  function walk(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = resolve(path, entry.name);
      const name = relative(root, full).replaceAll('\\', '/');
      if (entry.isSymbolicLink() || forbidden.test(name)) throw new Error(`Forbidden Pages artifact: ${name}`);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  }
  walk(root);
  for (const page of ['index.html', 'getting-started/index.html', 'security/index.html', 'release-notes/index.html', '404.html']) {
    if (!existsSync(resolve(root, page))) throw new Error(`Missing page: ${page}`);
  }
  for (const file of files.filter((file) => extname(file) === '.html')) {
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
      const href = match[1];
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) continue;
      const local = decodeURIComponent(href.split(/[?#]/)[0]);
      if (!local) continue;
      if (local.startsWith('/') && local !== `${baseurl}/` && !local.startsWith(`${baseurl}/`)) {
        throw new Error(`Link outside project baseurl: ${href}`);
      }
      const target = local.startsWith('/')
        ? resolve(root, `.${local.slice(baseurl.length)}`)
        : resolve(dirname(file), local);
      const rel = relative(root, target);
      if (rel === '..' || rel.startsWith('../') || ![target, resolve(target, 'index.html')].some(existsSync)) {
        throw new Error(`Broken local link in ${relative(root, file)}: ${href}`);
      }
    }
  }
  return { files: files.length, html: files.filter((file) => extname(file) === '.html').length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify({ check: 'pages-artifact', status: 'passed', ...verifyPages(process.argv[2] || '_site') }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
