import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import { renderRedirects, resolve } from '../scripts/lib/redirects.mjs';
import { getSettings } from '../src/lib/data';

const rules = parse(readFileSync('src/data/redirects.yaml', 'utf8')).redirects;
const txt = renderRedirects(rules, getSettings());
const oldUrls = readFileSync('migration/snapshot/old-urls.txt', 'utf8').split('\n').filter(Boolean);

describe('resolve', () => {
  test.each([
    ['/faq/', '/support/faq/'],
    ['/faq', '/support/faq/'],
    ['/2020/11/25/lymefiber-update-november-2020/', '/'],
    ['/wp-content/uploads/2021/08/Phone-LOA.pdf', '/documents/Phone-LOA.pdf'],
    ['/wp-content/uploads/2020/11/Phone-LOA.pdf', '/documents/Phone-LOA.pdf'],
    ['/signupforlymefiberservices/', 'https://order.lymefiber.net'],
    ['/lymefiber-dmca-policy/', '/documents/LymeFiber-Open-Internet-Transparency-Policy-01_01_2022.pdf'],
    ['/wp-content/uploads/2021/08/Lymefiber-DCMA-Policy-232x300.jpg', '/documents/'],
  ])('%s → %s', (from, to) => {
    expect(resolve(from, txt)).toBe(to);
  });

  test('unknown paths do not resolve', () => {
    expect(resolve('/plans/', txt)).toBeNull();
  });

  test('every old WordPress URL resolves', () => {
    const missing = oldUrls.filter((u) => u !== '/' && resolve(u, txt) === null);
    expect(missing).toEqual([]);
  });
});

describe('renderRedirects', () => {
  test('lines are "from to 301" with tokens filled in', () => {
    expect(txt).toContain('/signupforlymefiberservices/ https://order.lymefiber.net 301');
    expect(txt).not.toContain('{{');
  });
  test('exact rules come before wildcard rules', () => {
    const lines = txt.trim().split('\n');
    const firstSplat = lines.findIndex((l) => l.includes('*'));
    expect(lines.slice(firstSplat).every((l) => l.includes('*'))).toBe(true);
  });
});
