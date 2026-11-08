// Report broken internal links, unreplaced {{tokens}} and redirects that lead nowhere.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { resolve } from './redirects.mjs';

const htmlFiles = (dir) =>
  readdirSync(dir, { recursive: true })
    .map((f) => join(dir, String(f)))
    .filter((f) => f.endsWith('.html') && statSync(f).isFile());

/** Does `path` (like "/plans/" or "/fonts/a.woff2") exist in the built site? */
function exists(dist, path) {
  const clean = decodeURIComponent(path.split(/[?#]/)[0]);
  if (clean === '/' || clean === '') return existsSync(join(dist, 'index.html'));
  const p = join(dist, clean);
  return (existsSync(p) && statSync(p).isFile()) || existsSync(join(p, 'index.html'));
}

/**
 * @param {string} dist built site folder
 * @param {string[]} oldUrls old WordPress paths that must redirect somewhere real
 * @returns {string[]} problems, empty when all is well
 */
export function findProblems(dist, oldUrls = []) {
  const problems = [];
  const redirects = existsSync(join(dist, '_redirects')) ? readFileSync(join(dist, '_redirects'), 'utf8') : '';

  for (const file of htmlFiles(dist)) {
    const page = '/' + relative(dist, file);
    const html = readFileSync(file, 'utf8');
    for (const m of html.matchAll(/\{\{\s*[a-z_]+\s*\}\}|%7B%7B[a-z_%0-9]+%7D%7D/gi)) {
      problems.push(`${page}: unknown token ${decodeURIComponent(m[0])}`);
    }
    for (const m of html.matchAll(/\s(?:href|src)="(\/(?!\/)[^"]*)"/g)) {
      const link = m[1];
      if (!exists(dist, link) && !resolve(link.split(/[?#]/)[0], redirects)) problems.push(`${page}: broken link ${link}`);
    }
  }

  for (const url of oldUrls) {
    if (url === '/') continue;
    const to = resolve(url, redirects);
    if (to === null) problems.push(`old URL ${url} has no redirect`);
    else if (to.startsWith('/') && !exists(dist, to)) problems.push(`old URL ${url} → ${to} does not exist`);
  }
  return problems;
}
