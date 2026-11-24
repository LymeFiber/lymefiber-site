# Traffic report (404s and redirects) and Redirects editor — design

Date: 2026-11-24 · Status: approved 2026-11-24

## Intent

The new site replaces the old WordPress lymefiber.net. For the first weeks and months after launch,
visitors will arrive at addresses that no longer exist (old bookmarks, links from other sites, search
results). Rich wants to:

1. **See 404s** so he can fix broken links within the site, or add a page or redirect for addresses
   customers clearly think exist.
2. **See redirects being used** to learn how much traffic still comes in from old bookmarked addresses.
3. **Do both from the site editor** (`/admin/`), and add redirects there without touching code.

This is transitional. It should be cheap to run and easy to remove later.

## Goals

- Log every request that ends in a 404 or a redirect: time, host, path, status, redirect target, referrer.
- Keep 7 days of entries; anything older is deleted.
- A "Traffic report" page reachable from the editor, visible only to signed-in editors, always current.
- A "Redirects" section in the editor sidebar for adding/changing/removing redirect rules.

## Non-goals

- General analytics (page views, visitors, browsers). Not wanted here.
- Storing IP addresses or anything that identifies a visitor. (Anti-goal: the log must not become
  personal data.)
- Alerting or emails.

## Anti-goals

- The site must never go down or slow noticeably because of logging. A logging failure must not
  affect the response the visitor gets.
- The report must not be readable by the public.
- No daily commits or rebuilds caused by the report.

## Constraints and facts

- Hosting: Cloudflare Pages project `lymefiber-site`, free plan, built from `main` (`npm run build`,
  output `dist`). Test address test.lymefiber.net; production lymefiber.net after launch.
- Editor: Sveltia CMS at `/admin/` (`public/admin/index.html`, `public/admin/config.yml`), GitHub
  backend `LymeFiber/lymefiber-site`, login through the `cms-auth` Worker.
- Redirect rules live in `src/data/redirects.yaml` (`{from, to}`, `to` may contain `{{tokens}}` from
  `settings.yaml`, `*` splat at the end of `from`, first match wins). `scripts/gen-redirects.mjs`
  renders `dist/_redirects` via `renderRedirects()`; `resolve()` in `scripts/lib/redirects.mjs`
  already implements Cloudflare's matching for our rule shapes.
- **Cloudflare docs: `_redirects` rules are not applied to requests served by Pages Functions.**
  Therefore the middleware must perform redirects itself.
- Functions requests count against the Workers free quota (100,000/day). Static requests excluded
  by `_routes.json` are free. When the quota is exhausted, behaviour follows the project's
  "Fail open / closed" setting; it must be **fail open** (static assets keep being served).
- KV's free tier allows only 1,000 writes/day (bot scanners could exhaust it); D1 allows 100,000.

## Approaches considered

- **A. Live report page beside the editor (chosen).** Middleware logs to D1; `/admin/traffic/`
  shows the last 7 days live via an authenticated endpoint; linked from the editor. Always current,
  no commits. Trade-off: a separate page, not a sidebar item.
- **B. Daily summary file in the editor sidebar.** Scheduled job commits a YAML summary daily.
  Rejected: up to a day stale, a commit + rebuild every day, poor table display, editable by mistake.
- **C. Cloudflare dashboard / `wrangler pages deployment tail` only.** Rejected: not in the editor.

Rich chose A, plus a Redirects section in the editor.

## Design

### 1. Middleware (`functions/_middleware.js`)

For every request that reaches it:

1. Look the path up in the redirect rules (same rules and matching as `_redirects`: exact rules,
   the no-trailing-slash variant, then splats; first match wins). If it matches, respond with a 301
   to the target and log a `redirect` entry.
2. Otherwise call `context.next()`. If the response status is 404, log a `404` entry.
3. Return the response unchanged.

Logging is done with `context.waitUntil(...)` and wrapped so any error is swallowed (anti-goal: never
affect the visitor). Only GET/HEAD requests are logged.

The rules reach the middleware as a generated module/JSON written at build time from
`redirects.yaml` + `settings.yaml` (tokens already replaced), reusing `renderRedirects`/`resolve`
logic so there is one implementation of matching. `dist/_redirects` stays as the fail-open
fallback.

Entry fields: `ts` (UTC ms), `host`, `path` (path + query string), `status` (404 or 301), `target`
(redirects only), `referrer` (the `Referer` header, if any). No IP, no user agent.

### 2. Routing (`_routes.json`)

Include `/*`; exclude paths that are only build assets and never old-site addresses:
`/_astro/*`, `/fonts/*`, `/images/*`, `/favicon.svg`, `/og-image.png`, `/admin/*` (except the report
API, see below — put the API outside `/admin/`). `/documents/*` stays included so missing PDFs are
logged.

### 3. Storage (D1 database `lymefiber-traffic`)

One table:

```sql
CREATE TABLE hits (
  ts INTEGER NOT NULL, host TEXT, path TEXT NOT NULL, status INTEGER NOT NULL,
  target TEXT, referrer TEXT
);
CREATE INDEX hits_ts ON hits(ts);
```

Seven-day retention: the middleware deletes rows with `ts` older than 7 days on a small fraction of
writes (e.g. 1 in 100), and the report endpoint deletes them on each load. No cron needed.

Bound to the Pages project as `TRAFFIC_DB` (Pages → Settings → Bindings), for production and
preview. Schema kept in the repo (e.g. `functions/schema.sql`) with the one-time
`wrangler d1 execute` command in HANDOFF.md.

### 4. Report API (`functions/api/traffic.js`)

`GET /api/traffic` returns the last 7 days, grouped:

- **404s:** one row per path — count, first seen, last seen, top referrers (up to 3) with counts.
- **Redirects:** one row per path — count, target, last seen.
- Totals per day for each kind (to see the trend).

**Access:** the request must carry `Authorization: Bearer <GitHub token>`. The endpoint calls
`GET https://api.github.com/repos/LymeFiber/lymefiber-site` with that token and allows access only if
`permissions.push` is true (i.e. the person can edit the site). Results of that check are cached
briefly in memory per token. Otherwise 401/403. Responses are `Cache-Control: no-store`.

### 5. Report page (`public/admin/traffic/index.html`)

A plain static page (no framework), styled to sit comfortably beside the editor. It reads the GitHub
token Sveltia CMS stored in the browser after sign-in (same origin), calls `/api/traffic`, and shows:

```
Traffic report — last 7 days                      [Refresh]  [Back to editor]

Not found (404)                         [x] Hide bot probes
  Count  Address                         Last seen      Linked from
  42     /old-plans-page/                Nov 24 3:10 PM google.com (30), lymefiber.org (4)
  7      /wp-content/uploads/foo.pdf     Nov 23 9:02 AM —

Redirects used
  Count  Old address                     Went to                Last seen
  120    /faq/                           /support/faq/          Nov 24 4:01 PM
```

- Times in Eastern time, like the notice banner.
- "Hide bot probes" (on by default) hides obvious scanner paths: anything containing `wp-login`,
  `xmlrpc`, `wp-admin`, `.php`, `.env`, `.git`, `phpmyadmin`, and similar. The list is a constant in
  the page so it is easy to edit.
- If not signed in (no token, or 401/403): a message with a link to `/admin/` to sign in.
- Each 404 row has an "Add redirect…" link that opens the editor's Redirects section (deep link if
  Sveltia supports it; otherwise just the section) with the path copied to the clipboard.

A "Traffic report" button is added to the editor (in `public/admin/index.html`, same technique as
the existing save reminder) linking to `/admin/traffic/`.

### 6. Redirects section in the editor (`public/admin/config.yml`)

A new collection "Redirects" with one file entry, `src/data/redirects.yaml`, field `redirects`
(list) with:

- **Old address** (`from`): string, required, must start with `/`; hint explains `*` at the end
  matches everything below it.
- **Send to** (`to`): string, required; a path on this site, a full URL, or a `{{token}}`.

The list keeps its order (first match wins); the hint says to keep specific rules above `*` rules.
The YAML comments at the top of `redirects.yaml` will be lost when the editor saves; move that
guidance into the collection's description/hints. Editor saves trigger a rebuild as with any
other content.

`tests/cms-config.test.ts` is extended for the new collection; `npm run check` continues to verify
that every old URL still resolves.

### 7. Documentation

- EDITING.md: "Traffic report" and "Adding a redirect" sections in plain language.
- HANDOFF.md: D1 database, binding, fail-open setting, how to remove the feature later
  (delete `functions/`, the binding and the database).

## Decided by Rich

- Approach A; Redirects section in the editor; Cloudflare-hosted log; keep 7 days.

## Calls made by Claude (open to correction)

- D1 rather than KV or Analytics Engine (write limits; simple SQL grouping).
- No IP addresses or user agents stored.
- Report visible to anyone with edit (push) access to the repo.
- Bot probes hidden by default, with a toggle.
- Host is recorded, so test-site and pages.dev hits can be told apart from production.
- Pages project set to fail open.

## Left to the builder

- Exact way generated redirect rules reach the Function bundle (generated JS module under
  `functions/` vs. imported JSON), keeping a single matching implementation and tests.
- Exact localStorage key/shape where Sveltia keeps the GitHub token (verify against Sveltia
  0.252.0); fall back to a "paste token" prompt only if it can't be read.
- Whether Sveltia supports deep links to a file collection.
- Verify on a preview deployment that 404 status and redirect responses behave as designed before
  merging, including the fail-open setting.
