import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { isBotProbe, readToken, REDIRECTS_EDITOR_URL } from '../public/admin/traffic/report.js';

describe('isBotProbe', () => {
  test.each(['/wp-login.php', '/.env', '/xmlrpc.php', '/.git/config', '/WP-ADMIN/', '/phpmyadmin/', '/cgi-bin/x', '/default.aspx', '/wlwmanifest.xml'])(
    '%s is a bot probe', (p) => expect(isBotProbe(p)).toBe(true));
  test.each(['/faq/', '/wp-content/uploads/2021/08/x.pdf', '/documents/LymeFiber-E911-Legal-Disclaimer.pdf', '/old-plans-page/'])(
    '%s is shown', (p) => expect(isBotProbe(p)).toBe(false));
});

describe('readToken', () => {
  const storage = (v: string | null) => ({ getItem: (k: string) => (k === 'sveltia-cms.user' ? v : null) });
  test('reads the GitHub token Sveltia CMS saved at sign-in', () => {
    expect(readToken(storage(JSON.stringify({ backendName: 'github', token: 'gho_abc' })))).toBe('gho_abc');
  });
  test('null when signed out or unreadable', () => {
    expect(readToken(storage(null))).toBeNull();
    expect(readToken(storage('{}'))).toBeNull();
    expect(readToken(storage('not json'))).toBeNull();
  });
});

test('"Add redirect" opens the Redirects entry in the editor', () => {
  expect(REDIRECTS_EDITOR_URL).toBe('/admin/#/collections/redirects/entries/redirects');
});

test('the editor has a Traffic report button', () => {
  expect(readFileSync('public/admin/index.html', 'utf8')).toContain('href="/admin/traffic/"');
});

test('the report page is not indexed and loads the report script', () => {
  const html = readFileSync('public/admin/traffic/index.html', 'utf8');
  expect(html).toContain('<meta name="robots" content="noindex"');
  expect(html).toContain('report.js');
});
