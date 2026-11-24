// Redirect matching shared by the build (scripts/lib/redirects.mjs) and the Pages middleware.
// Plain JavaScript with no imports: Pages bundles functions/ separately from the Astro site.

/** Return where Cloudflare would send `path`, or null if no rule matches. */
export function resolve(path, redirectsText) {
  for (const line of redirectsText.split('\n')) {
    const [from, to] = line.trim().split(/\s+/);
    if (!from || from.startsWith('#')) continue;
    if (from.endsWith('*') ? path.startsWith(from.slice(0, -1)) : path === from) return to;
  }
  return null;
}
