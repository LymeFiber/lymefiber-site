// Build and read Cloudflare Pages _redirects files.
import { replaceTokens } from '../../src/lib/tokens.ts';

/**
 * @param {{from: string, to: string}[]} rules
 * @param {Record<string,string>} settings
 * @returns {string} _redirects file contents
 */
export function renderRedirects(rules, settings) {
  const exact = [];
  const splat = [];
  for (const { from, to } of rules) {
    const target = replaceTokens(to, settings).text;
    if (from.includes('*')) {
      splat.push(`${from} ${target} 301`);
    } else {
      exact.push(`${from} ${target} 301`);
      // Also catch the same address typed without the trailing slash.
      if (from.endsWith('/') && from !== '/') exact.push(`${from.slice(0, -1)} ${target} 301`);
    }
  }
  return [...exact, ...splat].join('\n') + '\n';
}

/** Return where Cloudflare would send `path`, or null if no rule matches. */
export function resolve(path, redirectsText) {
  for (const line of redirectsText.split('\n')) {
    const [from, to] = line.trim().split(/\s+/);
    if (!from || from.startsWith('#')) continue;
    if (from.endsWith('*') ? path.startsWith(from.slice(0, -1)) : path === from) return to;
  }
  return null;
}
