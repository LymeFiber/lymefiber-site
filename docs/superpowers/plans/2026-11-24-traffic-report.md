# Traffic Report and Redirects Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log every 404 and redirect on the site to Cloudflare D1 for 7 days, show them on an editors-only report page beside the site editor, and let editors manage redirects in the editor.

**Architecture:** A Cloudflare Pages Functions middleware performs the site's redirects itself (Pages does not apply `_redirects` to Function requests) using rules generated at build time, and logs redirects and 404s to D1 via `waitUntil`. `/api/traffic` returns a grouped 7-day summary to callers whose GitHub token has push access to the repo. A static page at `/admin/traffic/` reads Sveltia's stored token and renders the summary. Redirect rules become a Sveltia collection.

**Tech Stack:** Astro 7 static site, Cloudflare Pages Functions (plain ES modules, no dependencies), Cloudflare D1, Sveltia CMS 0.252.0, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-11-24-traffic-report-design.md`

## Global Constraints

- Functions code is plain JavaScript ES modules under `functions/`, no npm dependencies, no TypeScript imports (Pages bundles it separately from Astro).
- D1 binding name: `TRAFFIC_DB`. Table `hits(ts INTEGER NOT NULL, host TEXT, path TEXT NOT NULL, status INTEGER NOT NULL, target TEXT, referrer TEXT)`, index `hits_ts` on `ts`.
- Retention: 7 days = `7 * 24 * 60 * 60 * 1000` ms.
- Never store IP addresses or user agents.
- Logging must never change or fail the visitor's response: missing binding, D1 errors, and exceptions in logging are swallowed.
- Only `GET` and `HEAD` requests are logged.
- Redirect status: 301. Matching must be identical to `dist/_redirects` (single implementation).
- Report access: `Authorization: Bearer <token>`; allowed only if `GET https://api.github.com/repos/LymeFiber/lymefiber-site` with that token returns `permissions.push === true`. API responses carry `Cache-Control: no-store`.
- Times in the report shown in Eastern time (`America/New_York`).
- Editor collection order becomes: `notice, pages, menu, documents, redirects, settings`.
- Plain-language copy for editors, matching EDITING.md's tone.

## Review Focus

1. **Query strings on old addresses** (`/faq/?utm_source=x`): must still redirect (match on pathname only) and keep the query string on the target when the target has none. → Task 3 test.
2. **D1 binding missing** (local `astro dev`, a preview without the binding): site serves normally, no exception. → Task 3 test.
3. **D1 throws on insert**: visitor still gets the normal response. → Task 3 test.
4. **Very long paths/referrers from bots**: stored values truncated to 500 characters. → Task 2 test.
5. **Expired or revoked GitHub token in the report page**: API returns 401, page shows the "sign in to the editor" message instead of a blank page. → Task 4 test (API side); Task 5 manual check (page side).

---

### Task 1: Single redirect matcher shared by build and Functions

**Files:**
- Create: `functions/_lib/resolve.js`
- Modify: `scripts/lib/redirects.mjs` (move `resolve` out, re-export it)
- Modify: `scripts/gen-redirects.mjs` (also write `functions/_lib/rules.generated.js`)
- Create: `public/_routes.json`
- Modify: `.gitignore` (add `functions/_lib/rules.generated.js`)
- Test: `tests/redirects.test.ts`

**Interfaces:**
- Produces: `resolve(path: string, redirectsText: string): string | null` exported from `functions/_lib/resolve.js` (unchanged behaviour; still exported from `scripts/lib/redirects.mjs`).
- Produces: `functions/_lib/rules.generated.js` with `export default "<contents of dist/_redirects>";` written by `npm run build`.

- [ ] **Step 1: Write the failing tests** in `tests/redirects.test.ts`:

```ts
import { resolve as fnResolve } from '../functions/_lib/resolve.js';
test('Functions and build use the same matcher', () => {
  expect(fnResolve).toBe(resolve);
});
test('routes file skips build assets but not documents', () => {
  const r = JSON.parse(readFileSync('public/_routes.json', 'utf8'));
  expect(r).toEqual({ version: 1, include: ['/*'], exclude: ['/_astro/*', '/fonts/*', '/images/*', '/favicon.svg', '/og-image.png', '/admin/*'] });
});
```

Add to `tests/check-site.test.ts` (or wherever the build output is tested after global setup builds `dist/`): `functions/_lib/rules.generated.js` exists after build and its default export equals `readFileSync('dist/_redirects','utf8')`.

- [ ] **Step 2: Run** `npm test -- redirects` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement.** Move `resolve` into `functions/_lib/resolve.js`; `scripts/lib/redirects.mjs` does `export { resolve } from '../../functions/_lib/resolve.js';`. `gen-redirects.mjs` writes the generated module with `JSON.stringify(text)`. Add `public/_routes.json` with exactly the object above. Gitignore the generated file.
- [ ] **Step 4: Run** `npm test` and `npm run build && npm run check` — Expected: all pass, `0 problems`.
- [ ] **Step 5: Commit** `git commit -m "Share redirect matcher with Pages Functions; add _routes.json"`

---

### Task 2: Hit storage (D1)

**Files:**
- Create: `functions/schema.sql`
- Create: `functions/_lib/hits.js`
- Test: `tests/traffic-hits.test.ts`

**Interfaces:**
- Produces: `RETENTION_MS = 604800000`
- Produces: `async logHit(db, hit: {ts:number, host:string, path:string, status:number, target?:string|null, referrer?:string|null}): Promise<void>` — one `INSERT`; strings truncated to 500 chars.
- Produces: `async pruneOld(db, now: number): Promise<void>` — `DELETE FROM hits WHERE ts < ?` with `now - RETENTION_MS`.
- Produces: `async recentHits(db, now: number): Promise<Hit[]>` — rows with `ts >= now - RETENTION_MS`, newest first.

Tests use a fake `db` recording `prepare(sql).bind(...args).run()/.all()` calls (D1 API shape).

- [ ] **Step 1: Write failing tests:** `logHit` binds `[ts, host, path, status, target ?? null, referrer ?? null]` in that order; a 2,000-char path and referrer are stored as 500 chars; `pruneOld(db, 1_000_000_000_000)` binds `1_000_000_000_000 - 604800000`; `recentHits` SQL contains `ORDER BY ts DESC` and binds the same cutoff.
- [ ] **Step 2: Run** `npm test -- traffic-hits` — Expected: FAIL.
- [ ] **Step 3: Implement** `functions/_lib/hits.js`; write `functions/schema.sql` with the table and index from Global Constraints (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- [ ] **Step 4: Run** `npm test -- traffic-hits` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Add D1 hit storage for traffic report"`

---

### Task 3: Middleware — redirect and log

**Files:**
- Create: `functions/_middleware.js`
- Test: `tests/traffic-middleware.test.ts`

**Interfaces:**
- Consumes: `resolve` (Task 1), `rules.generated.js` default export (Task 1), `logHit`, `pruneOld` (Task 2).
- Produces: `export async function onRequest(context)`; also `export function handle(context, rulesText, now = Date.now(), rand = Math.random)` that `onRequest` delegates to, so tests inject rules, time and randomness.

Behaviour: resolve on `url.pathname`. Match → `Response.redirect`-equivalent 301 with `Location` = target (+ original `url.search` if target has no `?`), log `{status:301, target}`. No match → `await context.next()`; if `status === 404` log `{status:404}`. Log only GET/HEAD. Logging via `context.waitUntil(...)`, wrapped in try/catch; skipped when `context.env.TRAFFIC_DB` is missing. Prune when `rand() < 0.01`. `referrer` = `Referer` header or null; `host` = `url.host`.

- [ ] **Step 1: Write failing tests** with a fake context (`request`, `env.TRAFFIC_DB` fake db, `next` returning a given `Response`, `waitUntil` collecting promises; `await Promise.all(waited)` before asserting):
  - `/faq/` → 301, `Location: /support/faq/`, one hit `{path:'/faq/', status:301, target:'/support/faq/'}`, `next` not called.
  - `/faq/?utm_source=x` → `Location: /support/faq/?utm_source=x`; hit path `/faq/?utm_source=x`.
  - `/plans/` with `next` → 200: response passed through, no hit.
  - `/nope/` with `next` → 404 and `Referer: https://google.com/`: 404 passed through, hit `{status:404, referrer:'https://google.com/'}`.
  - `POST /nope/` → no hit.
  - `env` without `TRAFFIC_DB` → `/faq/` still 301, no throw.
  - fake db whose `run()` rejects → response unchanged, awaited `waitUntil` promises do not reject.
  - `rand = () => 0.001` → `pruneOld` called; `rand = () => 0.5` → not called.
- [ ] **Step 2: Run** `npm test -- traffic-middleware` — Expected: FAIL.
- [ ] **Step 3: Implement** `functions/_middleware.js`.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Local smoke:** `npm run build && npx wrangler@4.158.0 pages dev dist --d1 TRAFFIC_DB` then `curl -sI localhost:8788/faq/` → 301 to `/support/faq/`; `curl -sI localhost:8788/nope/` → 404. (Apply `functions/schema.sql` to the local D1 first with `npx wrangler@4.158.0 d1 execute TRAFFIC_DB --local --file functions/schema.sql` if needed; record the exact working commands in HANDOFF.md in Task 7.)
- [ ] **Step 6: Commit** `git commit -m "Pages middleware: perform redirects and log 404s/redirects"`

---

### Task 4: Report API

**Files:**
- Create: `functions/_lib/report.js`
- Create: `functions/api/traffic.js`
- Test: `tests/traffic-report.test.ts`

**Interfaces:**
- Consumes: `recentHits`, `pruneOld` (Task 2).
- Produces: `summarize(hits: Hit[]): { notFound: {path, count, firstSeen, lastSeen, referrers: {referrer, count}[]}[], redirects: {path, target, count, lastSeen}[], days: {day: 'YYYY-MM-DD', notFound: number, redirects: number}[] }` — `notFound` and `redirects` sorted by count desc then path; `referrers` top 3 by count, nulls excluded; `days` keyed by Eastern-time date, oldest first.
- Produces: `async isEditor(token: string, fetchFn = fetch): Promise<boolean>` — GitHub check from Global Constraints, with `User-Agent: lymefiber-traffic-report`; caches a true/false result per token in a module-level `Map` for 5 minutes.
- Produces: `onRequestGet(context)` → 401 `{error:'signin'}` with no/invalid token, 403 `{error:'forbidden'}` when not an editor, 503 `{error:'nodb'}` without `TRAFFIC_DB`, else 200 `{generatedAt, hosts: string[], ...summarize(hits)}`; always `Cache-Control: no-store`. Prunes before reading. `hosts` = distinct hosts in the hits so the page can filter.

- [ ] **Step 1: Write failing tests:** `summarize` groups three hits on `/a/` (two referrers google ×2, null ×1) into one row count 3 with `referrers: [{referrer:'https://google.com/', count:2}]`; redirects grouped by path with target; sort order; a hit at `2026-11-24T03:00Z` falls on day `2026-11-23` (Eastern). `isEditor` true for `{permissions:{push:true}}`, false for `push:false`, false for a 401 response, and the fake fetch is called once for two calls with the same token. `onRequestGet` returns 401 without header and `Cache-Control: no-store` on every response.
- [ ] **Step 2: Run** `npm test -- traffic-report` — Expected: FAIL.
- [ ] **Step 3: Implement** both files.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Add editors-only /api/traffic report endpoint"`

---

### Task 5: Report page and editor button

**Files:**
- Create: `public/admin/traffic/index.html`
- Create: `public/admin/traffic/report.js` (ES module: rendering + bot filter)
- Modify: `public/admin/index.html` (add "Traffic report" button)
- Test: `tests/traffic-page.test.ts`

**Interfaces:**
- Consumes: `/api/traffic` response shape (Task 4).
- Produces: `isBotProbe(path: string): boolean` and `BOT_PATTERNS: RegExp[]` exported from `report.js` — matches (case-insensitive) `wp-login`, `wp-admin`, `xmlrpc`, `wlwmanifest`, `\.php`, `\.env`, `\.git`, `phpmyadmin`, `cgi-bin`, `\.aspx?`.
- Produces: `readToken(storage: Storage): string | null` from `report.js` — reads the GitHub token Sveltia stores after sign-in. **Verify the key and shape** in Sveltia 0.252.0 (sign in at test.lymefiber.net/admin/ and inspect localStorage; expected `sveltia-cms.user` → JSON with `token`) and pin it in the test.

Page layout per spec §5 (two tables, "Hide bot probes" checkbox on by default, Refresh, Back to editor, a host selector when `hosts.length > 1` defaulting to all, Eastern times, per-day totals line). 401/403 → message "Sign in to the editor first" linking to `/admin/`; 503 → "The traffic log isn't set up yet." Each 404 row: "Add redirect…" button that copies the path to the clipboard and opens `/admin/#/collections/redirects` (check that Sveltia accepts this route; otherwise `/admin/`). Page has `<meta name="robots" content="noindex">`. Editor button: fixed, small, bottom-left, `<a href="/admin/traffic/">Traffic report</a>`, styled like the existing save reminder.

- [ ] **Step 1: Write failing tests:** `isBotProbe` true for `/wp-login.php`, `/.env`, `/xmlrpc.php`, `/.git/config`; false for `/faq/`, `/wp-content/uploads/2021/08/x.pdf` (real old document paths must stay visible), `/documents/LymeFiber-E911-Legal-Disclaimer.pdf`. `readToken` returns the token from a fake storage holding Sveltia's shape, and `null` when empty or malformed. `public/admin/index.html` contains `href="/admin/traffic/"`.
- [ ] **Step 2: Run** `npm test -- traffic-page` — Expected: FAIL.
- [ ] **Step 3: Implement** the page, module and button.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Manual check** with `wrangler pages dev` (Task 3 Step 5) after creating some hits with curl: signed out → sign-in message; with a valid token in localStorage → tables render, bot toggle works; with a bogus token → sign-in message.
- [ ] **Step 6: Commit** `git commit -m "Add traffic report page and editor link"`

---

### Task 6: Redirects section in the editor

**Files:**
- Modify: `public/admin/config.yml`
- Modify: `src/data/redirects.yaml` (move header comments into the editor hints; content otherwise unchanged)
- Test: `tests/cms-config.test.ts`

**Interfaces:**
- Collection `name: redirects`, `label: Redirects`, `icon: alt_route`, one file `name: redirects`, `label: Redirects`, `file: src/data/redirects.yaml`, field `redirects` (`widget: list`, `summary: "{{from}} → {{to}}"`) with subfields `from` (label "Old address", string, required, `pattern: ['^/', 'Must start with /']`) and `to` (label "Send to", string, required).
- Description copy: "Old or mistyped addresses and where to send visitors. Rules are checked top to bottom and the first match wins, so keep specific addresses above ones ending in *." `from` hint: "The address people arrive at, starting with /. End it with * to match everything below it, e.g. /2019/*." `to` hint: "A page on this site (/support/faq/), a full web address, or a contact token like {{signup_url}}."

- [ ] **Step 1: Write failing tests:** update "collections appear in the agreed order" to `['notice','pages','menu','documents','redirects','settings']` / `[..., 'Redirects', 'Site Settings']`; new `describe('Redirects')`: edits `src/data/redirects.yaml`; list field `redirects` with `from` (pattern `^/`, required) and `to`; description contains `first match wins`.
- [ ] **Step 2: Run** `npm test -- cms-config` — Expected: FAIL.
- [ ] **Step 3: Implement** the collection; replace the YAML header comments in `redirects.yaml` with a single line `# Edited in the site editor under Redirects. First match wins.` (keep group comments; Sveltia may drop them on save, which is acceptable).
- [ ] **Step 4: Run** `npm test && npm run build && npm run check` — Expected: PASS, `0 problems`.
- [ ] **Step 5: Commit** `git commit -m "Add Redirects section to the site editor"`

---

### Task 7: Cloudflare setup, docs, and live verification

**Files:**
- Modify: `EDITING.md` (sections "Traffic report" and "Adding or changing a redirect", plus Redirects in the sidebar list)
- Modify: `HANDOFF.md` (D1 database, binding, schema command, fail-open setting, local dev commands from Task 3, removal steps, change log entry)

- [ ] **Step 1: Write the docs.** HANDOFF removal steps: delete `functions/` and `public/_routes.json`, the `/admin/traffic/` page and editor button, remove the `TRAFFIC_DB` binding, delete the D1 database.
- [ ] **Step 2: Rich does the Cloudflare steps** (give him exact clicks/commands): create D1 database `lymefiber-traffic`; run `npx wrangler@4.158.0 d1 execute lymefiber-traffic --remote --file functions/schema.sql`; Pages project → Settings → Bindings → add D1 binding `TRAFFIC_DB` → `lymefiber-traffic` for Production and Preview; Settings → Runtime → Fail open.
- [ ] **Step 3: Push and verify on the deployed site** (pages.dev address, to avoid the stale test.lymefiber.net cache): `curl -sI https://lymefiber-site.pages.dev/faq/` → 301 `location: /support/faq/`; `curl -sI https://lymefiber-site.pages.dev/no-such-page/` → 404; the report page shows both hits after signing in; `/api/traffic` without a token → 401; `/_astro/*` asset responses unaffected; `npm run check` 0 problems; lychee run against the site shows no new errors.
- [ ] **Step 4: Commit** `git commit -m "Docs: traffic report and Redirects editor"` and push.
