import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { breadcrumbsFor } from '../src/lib/breadcrumbs';
import BaseLayout from '../src/layouts/BaseLayout.astro';
import Header from '../src/components/Header.astro';
import { getMenu, getSettings } from '../src/lib/data';

const s = getSettings();
const esc = (t: string) => t.replace(/&/g, '&amp;');

describe('breadcrumbsFor', () => {
  const titles: Record<string, string> = { '/plans/': 'Plans & Pricing', '/plans/broadband-labels/': 'Broadband Fact Labels' };
  const t = (p: string) => titles[p];
  test('builds Home → section → page', () => {
    expect(breadcrumbsFor('/plans/broadband-labels/', t)).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Plans & Pricing', href: '/plans/' },
      { label: 'Broadband Fact Labels', href: '/plans/broadband-labels/' },
    ]);
  });
  test('is empty on the home page', () => {
    expect(breadcrumbsFor('/', t)).toEqual([]);
  });
  test('skips path segments that have no page', () => {
    expect(breadcrumbsFor('/connect/installation/', (p) => (p === '/connect/installation/' ? 'Installation' : undefined)))
      .toEqual([{ label: 'Home', href: '/' }, { label: 'Installation', href: '/connect/installation/' }]);
  });
});

describe('<BaseLayout>', () => {
  const render = async (props: object = {}) =>
    (await AstroContainer.create()).renderToString(BaseLayout, {
      props: { title: 'FAQ', description: 'Questions', permalink: '/support/faq/', ...props },
      slots: { default: '<p>body</p>' },
    });

  test('header shows every menu section and a Sign Up button', async () => {
    const html = await render();
    for (const m of getMenu()) expect(html).toContain(esc(m.label));
    expect(html).toMatch(/<a[^>]*class="[^"]*signup[^"]*"[^>]*href="[^"]+"/);
    expect(html).toContain(`href="${s.signup_url}"`);
  });
  test('external links are marked', async () => {
    const html = await render();
    expect(html).toMatch(/href="https?:[^"]*"[^>]*rel="noopener"/);
    expect(html).toContain('(opens external site)');
  });
  test('footer has contact info and policy links', async () => {
    const html = await render();
    expect(html).toContain('Community-focused fiber internet for Lyme, Orford &amp; Hanover.');
    expect(html).toContain(s.support_phone);
    // Policy links come from the documents list; only PDFs that exist are linked.
    const footer = html.slice(html.indexOf('<footer'));
    const links = [...footer.matchAll(/href="(\/documents\/[^"]+\.pdf)"/g)].map((m) => m[1]);
    for (const l of links) expect(existsSync(`public${decodeURI(l)}`), l).toBe(true);
    expect(html).toContain('href="/terms/"');
  });
  test('head has title, description, canonical and og:image', async () => {
    const html = await render();
    expect(html).toContain('<title>FAQ | LymeFiber</title>');
    expect(html).toContain('<meta name="description" content="Questions"');
    expect(html).toContain('<link rel="canonical" href="https://lymefiber.net/support/faq/"');
    expect(html).toContain('property="og:image" content="https://lymefiber.net/og-image.png"');
  });
  test('notice banner comes right after the skip link', async () => {
    const html = await render({ notice: { enabled: true, level: 'outage', message: 'Down' } });
    expect(html).toMatch(/<body[^>]*>\s*<a[^>]*class="skip-link"[^>]*>[^<]*<\/a>\s*<div class="notice/);
  });
  test('adds noindex only when SITE_NOINDEX is set', async () => {
    expect(await render()).not.toContain('name="robots"');
    process.env.SITE_NOINDEX = '1';
    try {
      expect(await render()).toContain('<meta name="robots" content="noindex, nofollow"');
    } finally {
      delete process.env.SITE_NOINDEX;
    }
  });
  test('has a skip link and the wordmark', async () => {
    const html = await render();
    expect(html).toContain('href="#main"');
    expect(html).toContain('aria-label="LymeFiber"');
  });
});

test('tokens work in internal menu links too', async () => {
  const html = await (await AstroContainer.create()).renderToString(Header, {
    props: { menu: [{ label: 'Help', children: [{ label: 'Order', href: '{{signup_url}}' }] }] },
  });
  expect(html).toContain(`<a href="${s.signup_url}"`);
  expect(html).not.toContain('{{');
});
