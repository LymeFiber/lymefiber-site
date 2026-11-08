import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { findProblems } from '../scripts/lib/check.mjs';

function fakeSite() {
  const dir = mkdtempSync(join(tmpdir(), 'lf-check-'));
  mkdirSync(join(dir, 'plans'));
  writeFileSync(join(dir, 'index.html'), '<a href="/plans/">ok</a> <a href="/gone/">bad</a> <img src="/images/x.png"> {{supprt_phone}}');
  writeFileSync(join(dir, 'plans/index.html'), '<a href="/#main">ok</a> <a href="https://example.com">ext</a> <a href="mailto:a@b.c">m</a>');
  writeFileSync(join(dir, '_redirects'), '/faq/ /plans/ 301\n/old/ /nowhere/ 301\n');
  return dir;
}

test('reports broken links, unknown tokens and bad redirects', () => {
  const problems = findProblems(fakeSite(), ['/faq/', '/old/', '/never-redirected/']);
  expect(problems).toEqual(expect.arrayContaining([
    expect.stringContaining('/gone/'),
    expect.stringContaining('/images/x.png'),
    expect.stringContaining('{{supprt_phone}}'),
    expect.stringContaining('/old/ → /nowhere/'),
    expect.stringContaining('/never-redirected/'),
  ]));
  expect(problems).toHaveLength(5);
});

test('the real built site has no problems', () => {
  const urls = readFileSync('migration/snapshot/old-urls.txt', 'utf8').split('\n').filter(Boolean);
  expect(findProblems('dist', urls)).toEqual([]);
});
