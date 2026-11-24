import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import { PERMALINK_PATTERN, SETTINGS_KEYS } from '../src/lib/schemas';

const cfg = parse(readFileSync('public/admin/config.yml', 'utf8'));
const col = (name: string) => cfg.collections.find((c: any) => c.name === name);
const fileFields = (name: string) => col(name).files[0].fields;
const field = (fields: any[], name: string) => fields.find((f: any) => f.name === name);

test('backend commits straight to main on the LymeFiber repo', () => {
  expect(cfg.backend).toMatchObject({ name: 'github', repo: 'LymeFiber/lymefiber-site', branch: 'main' });
  expect(cfg.publish_mode).not.toBe('editorial_workflow');
});

test('collections appear in the agreed order', () => {
  expect(cfg.collections.map((c: any) => c.name)).toEqual(['notice', 'pages', 'menu', 'documents', 'redirects', 'settings']);
  expect(cfg.collections.map((c: any) => c.label)).toEqual(['Site Notice', 'Pages', 'Menu', 'Documents', 'Redirects', 'Site Settings']);
});

describe('Site Notice', () => {
  const f = () => fileFields('notice');
  test('edits src/data/notice.yaml', () => expect(col('notice').files[0].file).toBe('src/data/notice.yaml'));
  test('has the switch, level, message and time', () => {
    expect(field(f(), 'enabled').widget).toBe('boolean');
    expect(field(f(), 'level')).toMatchObject({ widget: 'select', options: expect.arrayContaining(['outage', 'maintenance', 'info'].map((v) => expect.objectContaining({ value: v }))) });
    expect(['text', 'string']).toContain(field(f(), 'message').widget);
    expect(field(f(), 'posted_at')).toMatchObject({ widget: 'datetime', default: '{{now}}' });
  });
  test('reminds editors to switch it off', () => {
    expect(JSON.stringify(f())).toContain('Turn off when resolved');
  });
});

test('page URL field uses the same pattern as the site schema', () => {
  const permalink = field(col('pages').fields, 'permalink');
  expect(permalink.pattern[0]).toBe(PERMALINK_PATTERN.source);
  expect(col('pages').folder).toBe('src/content/pages');
});

test('settings fields match the ten settings keys', () => {
  expect(fileFields('settings').map((f: any) => f.name).sort()).toEqual([...SETTINGS_KEYS].sort());
});

test('documents upload into public/documents', () => {
  const list = field(fileFields('documents'), 'documents');
  const file = field(list.fields, 'file');
  expect(file).toMatchObject({ widget: 'file', media_folder: '/public/documents', public_folder: '/documents' });
});

test('page images go to public/images', () => {
  expect(cfg).toMatchObject({ media_folder: 'public/images', public_folder: '/images' });
});

test('admin page loads a pinned CMS version', () => {
  expect(readFileSync('public/admin/index.html', 'utf8')).toMatch(/@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js/);
});

test('page fields the site depends on are visible, not hidden', () => {
  const fields = col('pages').fields;
  expect(field(fields, 'layout')).toBeUndefined();
  expect(field(fields, 'labels_csv')).toMatchObject({ widget: 'string', required: false });
});

describe('Redirects', () => {
  const list = () => field(fileFields('redirects'), 'redirects');
  test('edits src/data/redirects.yaml', () => {
    expect(col('redirects').files[0]).toMatchObject({ name: 'redirects', file: 'src/data/redirects.yaml' });
  });
  test('is a list of old address → new address', () => {
    expect(list().widget).toBe('list');
    expect(field(list().fields, 'from')).toMatchObject({ widget: 'string', required: true, pattern: ['^/\\S*$', expect.any(String)] });
    expect(field(list().fields, 'to')).toMatchObject({ widget: 'string', required: true });
  });
  test('explains that exact addresses win over ones ending in *', () => {
    expect(col('redirects').description).toContain('Exact addresses always win');
  });
  test('rejects addresses with spaces, and targets that are not /path, a web address or a {{token}}', () => {
    const from = new RegExp(field(list().fields, 'from').pattern[0]);
    const to = new RegExp(field(list().fields, 'to').pattern[0]);
    expect(from.test('/old-page/')).toBe(true);
    expect(from.test('/2019/*')).toBe(true);
    expect(from.test('/old doc.pdf')).toBe(false);
    expect(from.test('old/')).toBe(false);
    for (const ok of ['/support/faq/', 'https://order.lymefiber.net', '{{signup_url}}']) expect(to.test(ok)).toBe(true);
    for (const bad of ['support/faq/', '/support faq/', 'www.example.com']) expect(to.test(bad)).toBe(false);
  });
});
