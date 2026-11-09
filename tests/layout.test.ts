import { describe, expect, test } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { breadcrumbsFor } from '../src/lib/breadcrumbs';
import BaseLayout from '../src/layouts/BaseLayout.astro';

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

  test('header has the five sections and a Sign Up button', async () => {
    const html = await render();
    for (const l of ['Plans &amp; Pricing', 'Get Connected', 'Phone Service', 'Support', 'About']) expect(html).toContain(l);
    expect(html).toMatch(/<a[^>]*class="[^"]*signup[^"]*"[^>]*href="https:\/\/order\.lymefiber\.net"|href="https:\/\/order\.lymefiber\.net"[^>]*class="[^"]*signup/);
  });
  test('external links are marked', async () => {
    const html = await render();
    expect(html).toMatch(/href="https:\/\/account\.lymefiber\.net"[^>]*rel="noopener"/);
    expect(html).toContain('(opens external site)');
  });
  test('footer has contact info and policy links', async () => {
    const html = await render();
    expect(html).toContain('603-795-0915');
    expect(html).toContain('/documents/LymeFiber_Subscriber_Agreement_and_Terms-01_01_2022.pdf');
    expect(html).toContain('/documents/LymeFiber-Privacy-Policy-01_01_2022.pdf');
    expect(html).toContain('/documents/LymeFiber-Acceptable-Use-Policy.pdf');
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
