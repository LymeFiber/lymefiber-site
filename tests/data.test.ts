import { describe, expect, test } from 'vitest';
import { getSettings, getMenu, getNotice, getDocuments, PERMALINK_PATTERN } from '../src/lib/data';
import { SETTINGS_KEYS } from '../src/lib/schemas';

// These tests check that the editable data is *valid*, not what it says.
// Editors change phone numbers, menus, notices and documents through the CMS;
// those edits must never make the tests fail.

describe('settings', () => {
  test('has every key, each filled in', () => {
    const s = getSettings();
    expect(Object.keys(s).sort()).toEqual([...SETTINGS_KEYS].sort());
    for (const k of SETTINGS_KEYS) expect(s[k].trim(), k).not.toBe('');
  });
  test('emails look like emails and links look like links', () => {
    const s = getSettings();
    for (const k of SETTINGS_KEYS.filter((k) => k.endsWith('_email'))) expect(s[k], k).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/i);
    for (const k of SETTINGS_KEYS.filter((k) => k.endsWith('_url'))) expect(s[k], k).toMatch(/^https?:\/\/\S+$/);
  });
});

describe('menu', () => {
  test('has sections, and every link has a label and an address', () => {
    const menu = getMenu();
    expect(menu.length).toBeGreaterThan(0);
    for (const m of menu) {
      expect(m.label.trim()).not.toBe('');
      for (const c of m.children ?? []) {
        expect(c.label.trim()).not.toBe('');
        expect(c.href?.trim(), c.label).toBeTruthy();
      }
    }
  });
  test('any {{token}} in a menu link is a real setting', () => {
    const hrefs = getMenu().flatMap((m) => [m.href, ...(m.children ?? []).map((c) => c.href)]).filter(Boolean) as string[];
    for (const h of hrefs)
      for (const [, k] of h.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) expect(SETTINGS_KEYS as readonly string[], h).toContain(k);
  });
});

describe('notice', () => {
  test('is valid, and has a message whenever it is switched on', () => {
    const n = getNotice();
    expect(typeof n.enabled).toBe('boolean');
    if (n.enabled) expect(n.message.trim()).not.toBe('');
  });
});

describe('documents', () => {
  test('every entry is a PDF in a known category', () => {
    const docs = getDocuments();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((d) => d.file.startsWith('/documents/') && d.file.endsWith('.pdf'))).toBe(true);
    for (const d of docs) expect(['Policies', 'Phone', 'Customer Forms']).toContain(d.category);
  });
});

describe('PERMALINK_PATTERN', () => {
  test.each(['/', '/plans/', '/plans/broadband-labels/'])('accepts %s', (p) => {
    expect(PERMALINK_PATTERN.test(p)).toBe(true);
  });
  test.each(['/About Us/', 'about-us', '/plans', '/Plans/'])('rejects %s', (p) => {
    expect(PERMALINK_PATTERN.test(p)).toBe(false);
  });
});
