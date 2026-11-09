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
  expect(cfg.collections.map((c: any) => c.name)).toEqual(['notice', 'pages', 'menu', 'documents', 'settings']);
  expect(cfg.collections.map((c: any) => c.label)).toEqual(['Site Notice', 'Pages', 'Menu', 'Documents', 'Site Settings']);
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
