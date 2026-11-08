import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import DocumentList from '../src/components/DocumentList.astro';

const read = (p: string) => readFileSync(p, 'utf8');

describe('built site', () => {
  test('home page is built from the page with permalink "/"', () => {
    expect(read('dist/index.html')).toContain('Fiber Internet for Lyme, Orford &amp; Hanover');
  });
  test('documents page lists Policies before Phone before Customer Forms', () => {
    const html = read('dist/documents/index.html');
    const i = (s: string) => html.indexOf(`>${s}</h2>`);
    expect(i('Policies')).toBeGreaterThan(-1);
    expect(i('Policies')).toBeLessThan(i('Phone'));
    expect(i('Phone')).toBeLessThan(i('Customer Forms'));
  });
  test('404 page exists', () => {
    expect(existsSync('dist/404.html')).toBe(true);
  });
  test('sitemap lists pages and skips 404', () => {
    const sm = read('dist/sitemap-0.xml');
    expect(sm).toContain('<loc>https://lymefiber.net/</loc>');
    expect(sm).toContain('https://lymefiber.net/documents/');
    expect(sm).not.toContain('404');
  });
  test('robots.txt points at the sitemap and hides /admin/', () => {
    const r = read('dist/robots.txt');
    expect(r).toContain('Sitemap: https://lymefiber.net/sitemap-index.xml');
    expect(r).toContain('Disallow: /admin/');
  });
  test('no unreplaced tokens in output', () => {
    expect(read('dist/index.html')).not.toMatch(/\{\{|%7B%7B/);
  });
});

describe('<DocumentList>', () => {
  test('omits entries whose file does not exist', async () => {
    const html = await (await AstroContainer.create()).renderToString(DocumentList, {
      props: {
        docs: [
          { title: 'Real', description: '', file: '/documents/Phone-LOA.pdf', category: 'Customer Forms', updated: '2020-11-01' },
          { title: 'Ghost', description: '', file: '/documents/nope.pdf', category: 'Policies', updated: '2020-01-01' },
        ],
      },
    });
    expect(html).toContain('Real');
    expect(html).not.toContain('Ghost');
    expect(html).toMatch(/PDF · \d+ KB · Updated Nov 2020/);
  });
});
