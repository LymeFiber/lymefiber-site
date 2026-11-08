import type { Settings } from './schemas';

export type TokenResult = { text: string; unknown: string[] };

const PLAIN = /\{\{\s*([a-z_]+)\s*\}\}/g;
// Markdown engines percent-encode braces and spaces inside link targets.
const ENCODED = /%7B%7B(?:%20)*([a-z_]+)(?:%20)*%7D%7D/gi;

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function swap(text: string, pattern: RegExp, settings: Settings, encode: (v: string) => string): TokenResult {
  const unknown: string[] = [];
  const out = text.replace(pattern, (whole, key: string) => {
    if (Object.hasOwn(settings, key)) return encode(String(settings[key as keyof Settings]));
    unknown.push(key);
    return whole;
  });
  return { text: out, unknown };
}

/** Replace {{key}} tokens in plain text. Unknown tokens are left as written. */
export function replaceTokens(text: string, settings: Settings): TokenResult {
  return swap(text, PLAIN, settings, (v) => v);
}

/** Replace tokens in rendered HTML, including percent-encoded ones in link targets. */
export function replaceTokensInHtml(html: string, settings: Settings): TokenResult {
  const a = swap(html, ENCODED, settings, escapeHtml);
  const b = swap(a.text, PLAIN, settings, escapeHtml);
  return { text: b.text, unknown: [...a.unknown, ...b.unknown] };
}

/** Warn (never throw) about unknown tokens so a typo can't block a deploy. */
export function warnUnknown(unknown: string[], where: string) {
  for (const key of unknown) console.warn(`[tokens] unknown token {{${key}}} in ${where}`);
}
