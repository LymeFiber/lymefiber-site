import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { selectPages } from '../src/lib/pages';
import { findDuplicatePermalinks } from '../scripts/lib/check.mjs';

const p = (id: string, permalink: string) => ({ id, permalink });
const keptIds = (pages: { id: string; permalink: string }[]) => selectPages(pages).kept.map((x) => x.id).sort();

describe('selectPages', () => {
  test('home.md always owns "/", even if a new page sorts first', () => {
    const r = selectPages([p('about-us', '/'), p('home', '/')]);
    expect(r.kept.map((x) => x.id)).toEqual(['home']);
    expect(r.skipped).toEqual([{ id: 'about-us', permalink: '/', keptId: 'home' }]);
  });
  test('an existing page keeps its address when a new page claims it', () => {
    expect(keptIds([p('new-pricing', '/plans/'), p('plans', '/plans/')])).toEqual(['plans']);
  });
  test('falls back to the first file name when no file name matches', () => {
    expect(keptIds([p('b-page', '/x/'), p('a-page', '/x/')])).toEqual(['a-page']);
  });
  test('pages with different addresses are all kept', () => {
    expect(keptIds([p('home', '/'), p('plans', '/plans/'), p('faq', '/support/faq/')])).toEqual(['faq', 'home', 'plans']);
  });
});

test('the site check reports duplicate page addresses', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lf-pages-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'plans.md'), '---\ntitle: Plans\npermalink: /plans/\n---\nx\n');
  writeFileSync(join(dir, 'new-pricing.md'), '---\ntitle: New\npermalink: /plans/\n---\nx\n');
  writeFileSync(join(dir, 'faq.md'), '---\ntitle: FAQ\npermalink: /support/faq/\n---\nx\n');
  expect(findDuplicatePermalinks(dir)).toEqual([
    'page new-pricing.md uses /plans/, which belongs to plans.md; it is not published',
  ]);
});

test('the real site has no duplicate page addresses', () => {
  expect(findDuplicatePermalinks('src/content/pages')).toEqual([]);
});
