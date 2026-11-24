import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const html = (p: string) => readFileSync(`dist/${p}`, 'utf8');

test('the build writes a Pagefind search index', () => {
  expect(existsSync('dist/pagefind/pagefind.js')).toBe(true);
});

test('only the main content of a page is indexed', () => {
  expect(html('plans/index.html')).toMatch(/<main[^>]*data-pagefind-body/);
});

test('breadcrumbs are left out of the index', () => {
  expect(html('connect/exterior/index.html')).toMatch(/<nav class="breadcrumbs"[^>]*data-pagefind-ignore/);
});

test('the 404 page is not indexed', () => {
  expect(html('404.html')).not.toContain('data-pagefind-body');
});
