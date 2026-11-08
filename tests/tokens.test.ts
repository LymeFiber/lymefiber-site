import { describe, expect, test } from 'vitest';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { replaceTokens, replaceTokensInHtml } from '../src/lib/tokens';
import { getSettings } from '../src/lib/data';

const s = getSettings();
const md = async (src: string) => (await (await createSatteriMarkdownProcessor({})).render(src)).code;

describe('replaceTokens', () => {
  test('replaces a known token', () => {
    expect(replaceTokens('Call {{support_phone}}', s)).toEqual({ text: 'Call 603-795-0915', unknown: [] });
  });
  test('allows spaces inside the braces', () => {
    expect(replaceTokens('{{ support_phone }}', s).text).toBe('603-795-0915');
  });
  test('leaves an unknown token in place and reports it', () => {
    expect(replaceTokens('Call {{supprt_phone}}', s)).toEqual({ text: 'Call {{supprt_phone}}', unknown: ['supprt_phone'] });
  });
});

describe('replaceTokensInHtml (rendered Markdown)', () => {
  test('fills a token used as a link target', async () => {
    const { text } = replaceTokensInHtml(await md('[Pay]({{billing_portal_url}})'), s);
    expect(text).toContain('<a href="https://account.lymefiber.net">Pay</a>');
  });
  test('fills a token inside a tel: link', async () => {
    const { text } = replaceTokensInHtml(await md('[Call](tel:{{support_phone}})'), s);
    expect(text).toContain('href="tel:603-795-0915"');
  });
  test('escapes values for HTML', () => {
    const { text } = replaceTokensInHtml('<p>{{copyright_name}}</p>', { ...s, copyright_name: 'A & B <x>' });
    expect(text).toBe('<p>A &amp; B &lt;x&gt;</p>');
  });
  test('unknown encoded token stays and is reported', async () => {
    const r = replaceTokensInHtml(await md('[x]({{nope}})'), s);
    expect(r.unknown).toEqual(['nope']);
  });
});
