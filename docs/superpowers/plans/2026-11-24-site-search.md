# Site Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Pagefind search in a header dropdown, with searches that find nothing logged to D1 and shown in the traffic report.
**Architecture:** Pagefind indexes `dist/` at build time; a header script loads `/pagefind/pagefind.js` on first open and renders results; a pure `MissLogger` decides when to beacon zero-result queries to a Pages Function that writes to D1.
**Tech Stack:** Astro 7, Pagefind 1.6, Cloudflare Pages Functions + D1, Vitest.
**Spec:** `docs/superpowers/specs/2026-11-24-site-search-design.md`

## Global Constraints
- Queries logged only if trimmed length ≥ 3 and results = 0; stored ≤ 100 chars; once per distinct (lower-cased) query per page view; triggers: 2000 ms pause, Enter, panel close.
- D1 table `searches(ts INTEGER NOT NULL, host TEXT, query TEXT NOT NULL)`, index `searches_ts`; retention 7 days (`RETENTION_MS`).
- Logging never affects the visitor (missing binding / D1 errors swallowed; endpoint returns 204).
- Max 8 results shown.

## Review Focus
1. Query of only spaces or < 3 chars → never logged. (Task 2 test)
2. Same query typed, deleted, retyped → logged once. (Task 2 test)
3. Oversized or non-JSON POST body → 204/400 without touching D1, no exception. (Task 3 test)
4. Pagefind index missing (astro dev) → panel shows a message, no console error loop. (Task 4 manual)
5. Search panel open + mobile menu toggle → both usable; Esc closes the panel first. (Task 4 manual)

### Task 1: Build the index
Files: `package.json`, `src/layouts/BaseLayout.astro`, `src/components/Breadcrumbs.astro`, `src/pages/404.astro`, `public/_routes.json`, tests `tests/search-index.test.ts`, `tests/redirects.test.ts`.
- [ ] Tests: `dist/pagefind/pagefind.js` exists after build; built `/plans/index.html` `<main>` has `data-pagefind-body`; breadcrumbs nav has `data-pagefind-ignore`; built `404.html` has no `data-pagefind-body`; `_routes.json` exclude includes `/pagefind/*`. Run → FAIL.
- [ ] Implement: `pagefind` devDependency; build = `astro build && pagefind --site dist && node scripts/gen-redirects.mjs`; `BaseLayout` prop `searchable = true` sets `data-pagefind-body` on `<main>`; 404 passes `searchable={false}`. Run → PASS. Commit.

### Task 2: Miss logger (pure)
Files: `src/lib/search-miss.ts`, test `tests/search-miss.test.ts`.
Produces: `class MissLogger { constructor(send: (q: string) => void, delayMs = 2000); update(query: string, resultCount: number): void; flush(): void }` — `update` (re)starts the pause timer when it should log; `flush` (Enter/close) logs the pending query now; `normalizeQuery(q): string` (trim, collapse spaces, ≤ 100 chars).
- [ ] Tests (vi fake timers): logs after 2 s pause with 0 results; not when results > 0; not for `'  ab '`; flush logs immediately; same query (any case) only once; a later query with results cancels the pending one; 150-char query sent as 100 chars. Run → FAIL. Implement → PASS. Commit.

### Task 3: Storage + endpoint + report
Files: `functions/schema.sql`, `functions/_lib/hits.js` (`logSearch(db,{ts,host,query})`, `recentSearches(db, now)`, `pruneOld` also prunes `searches`), `functions/api/search-miss.js` (`onRequestPost`, exported `handleMiss(context, now)`), `functions/_lib/report.js` (`summarizeSearches(rows) → {query,count,lastSeen}[]` grouped by lower-case, count desc), `functions/api/traffic.js` (adds `searches` to response, filtered by `?host=`), `public/admin/traffic/report.js` (third table). Tests: `tests/traffic-hits.test.ts`, `tests/search-endpoint.test.ts`, `tests/traffic-report.test.ts`.
- [ ] Tests: `logSearch` binds `[ts, host, query]` and cuts to 100; `pruneOld` deletes from both tables; endpoint: valid `{q:'fiber in orford'}` → 204 + one insert; short/blank/non-string/non-JSON/body > 1000 bytes → 400, no insert; no binding → 204; D1 throws → 204; report includes grouped `searches`. Run → FAIL. Implement → PASS. Apply schema to remote D1 (`wrangler d1 execute lymefiber-traffic --remote --file functions/schema.sql`, idempotent). Commit.

### Task 4: Header search UI
Files: `src/components/Header.astro`, `src/components/SiteSearch.astro` (panel markup + script), `src/styles/global.css`, test `tests/layout.test.ts` (built HTML has the toggle buttons with `aria-controls="site-search"` and the panel `hidden`).
- [ ] Test → FAIL. Implement: panel + buttons; script lazy-imports `/pagefind/pagefind.js` (`/* @vite-ignore */`), debounced `pagefind.debouncedSearch`, renders ≤ 8 results (title link + excerpt — Pagefind excerpts contain only `<mark>`), keyboard handling, wires `MissLogger` with `navigator.sendBeacon('/api/search-miss', JSON)`. Run → PASS. Manual check with `wrangler pages dev dist` (search works; zero-result query appears in `searches`). Commit.

### Task 5: Docs, deploy check
- [ ] HANDOFF (search section, table, removal, change log) and EDITING (report table). Commit. Push branch → preview: search returns results; a zero-result search shows in `/api/traffic`. Merge after Rich's OK.
