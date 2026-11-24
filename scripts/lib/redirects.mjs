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

export { resolve } from '../../functions/_lib/resolve.js';
