# LymeFiber.net Static Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the WordPress LymeFiber.net with an Astro static site built from Markdown and edited through Sveltia CMS, hosted on Cloudflare Pages, in the "Village Green" style, with a site-wide outage banner.

**Architecture:** Content (Markdown pages, YAML data, PDFs) lives in a GitHub repo. Astro builds static HTML. A post-build script writes the Cloudflare `_redirects` file. Sveltia CMS at `/admin/` commits edits to `main` through GitHub OAuth (the `sveltia-cms-auth` Cloudflare Worker), and Cloudflare Pages rebuilds on every push. A separate GitHub Action checks links and redirects. Content mistakes are reported but never block a deploy.

**Tech Stack:** Node 26, Astro (current release from `npm create astro@latest`, pinned in `package-lock.json`), TypeScript, Vitest (with Astro's Container API for component tests), `yaml`, `turndown` (migration only), `opentype.js` (wordmark only), `@astrojs/sitemap`, Sveltia CMS (pinned version via unpkg), Cloudflare Pages and Workers (via `npx wrangler`).

**Spec:** `docs/superpowers/specs/2026-11-07-lymefiber-site-design.md`

## Global Constraints

- Static output only. No database, no server runtime apart from the OAuth Worker.
- Palette: red `#ab3d12` (outage banner, rare emphasis), dark green `#004f3e` (headings, nav text, footer), leaf green `#50792d` (buttons, accents), cream `#faf7f0` (page background), white cards, text `#2b2b2b`. All text/background pairs pass WCAG AA.
- Headings and wordmark in **Sorts Mill Goudy** (OFL, self-hosted WOFF2). Body in a system sans stack. Readable column of about 70 characters.
- Wordmark: "Lyme" `#50792d`, "Fiber" `#ab3d12`, outlined SVG, `role="img"` `aria-label="LymeFiber"`.
- Contact details and external URLs live only in `src/data/settings.yaml`. Pages refer to them with `{{key}}` tokens.
- Policy documents stay as PDFs, copied byte-for-byte.
- Every old WordPress URL returns a 301 to a page that exists.
- **A content mistake (unknown token, missing PDF, bad menu link) must never fail `npm run build`.** It produces a build warning and is reported by `npm run check`. Otherwise an unrelated typo could block an outage notice from publishing.
- Times are displayed in `America/New_York`, whatever the build machine's time zone.
- Lighthouse (mobile) ≥ 95 in all four categories on `/` and `/plans/`.
- Content can be read without JavaScript. The only site JS is the mobile menu.
- Repo: private `richb-hanover/lymefiber-site` (temporary). Cloudflare Pages project `lymefiber` → `lymefiber.pages.dev`. All account-specific values are recorded in `HANDOFF.md`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Outage notice switched on with an empty message, or no `posted_at`.** Expected: an empty message renders no banner. A missing time renders the banner without a "Posted" line. Never an empty red bar or "Posted Invalid Date". (Task 5 tests)
2. **Notice posted near midnight or across a DST change, built on a UTC machine.** Expected: "Posted" shows the correct Eastern date and time. (Task 5 tests)
3. **Editor typo in a token (`{{supprt_phone}}`) or a page pointing at a deleted PDF.** Expected: the build still succeeds and publishes (so a banner posted at the same time still goes live). The literal token stays visible. `npm run check` flags it. (Task 4 and Task 9 tests)
4. **Editor creates a new page with a URL path like `/About Us/` or `about-us` (no slashes).** Expected: the CMS rejects it with a clear pattern hint. The schema normalizes nothing silently. A page not in the menu is still built and listed in the sitemap. (Task 3 and Task 8 tests)
5. **Notice message containing raw HTML or a Markdown link.** Expected: the link renders as a link. Raw HTML is escaped, never injected. (Task 5 tests)

---

## File Structure

```
astro.config.mjs                 Astro config: site URL, sitemap, remark settings plugin
package.json                     scripts: dev, build (astro build && node scripts/gen-redirects.mjs), test, check
src/
  data/settings.yaml             contact + URLs (single source of truth)
  data/notice.yaml               outage banner
  data/menu.yaml                 top menu
  data/documents.yaml            PDF list
  data/redirects.yaml            old path → new target (target may be {{token}})
  content.config.ts              Zod schemas: pages collection + data files
  content/pages/*.md             one file per page, front matter `permalink`
  lib/data.ts                    typed loaders for the YAML files
  lib/tokens.ts                  replaceTokens(), remarkSettings plugin
  lib/notice.ts                  formatPostedAt(), shouldShowNotice()
  lib/labels-csv.ts              parseLabelsCsv()
  lib/breadcrumbs.ts             breadcrumbsFor()
  components/NoticeBanner.astro
  components/Header.astro        wordmark, dropdown menus, Sign Up button, mobile drawer
  components/Footer.astro
  components/Breadcrumbs.astro
  components/DocumentList.astro
  components/LabelsTable.astro
  layouts/BaseLayout.astro       <head>, SEO/OG, banner, header, footer
  layouts/HomeLayout.astro       hero + cards
  pages/[...slug].astro          renders every page by permalink (including "/")
  pages/documents.astro          /documents/
  pages/404.astro
  styles/global.css              tokens, type, layout
  assets/wordmark.svg, wordmark-reverse.svg
public/
  fonts/SortsMillGoudy-*.woff2
  documents/*.pdf, *.csv
  images/
  admin/index.html, admin/config.yml
  favicon.svg, og-image.png, robots.txt
scripts/
  build-wordmark.mjs             one-off: font → outlined SVGs
  gen-redirects.mjs              post-build: redirects.yaml + settings → dist/_redirects
  check-site.mjs                 links + old-URL resolution report (npm run check)
migration/
  snapshot.mjs                   one-off: copy live WordPress site to migration/snapshot/
  convert.mjs                    one-off: snapshot HTML → Markdown drafts
  snapshot/                      committed copy of the old site
tests/                           Vitest specs, one per lib/component
.github/workflows/check.yml      npm test + build + check on push
EDITING.md, HANDOFF.md
```

---

### Task 1: Scaffold project and repository

**Files:**
- Create: Astro project at repo root, `vitest.config.ts`, `tests/smoke.test.ts`, `.github/workflows/check.yml`, `HANDOFF.md`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test`, `npm run check` (stub that exits 0 for now)

- [ ] **Step 1:** `npm create astro@latest . -- --template minimal --typescript strict --no-git --install` (keep the existing `docs/` and `.gitignore`). Add `vitest`, `yaml`, `@astrojs/sitemap`. Set `site: 'https://lymefiber.net'` and `trailingSlash: 'always'` in `astro.config.mjs`.
- [ ] **Step 2: Write the failing test** `tests/smoke.test.ts`: `expect(existsSync('dist/index.html')).toBe(true)` after a build (use `globalSetup` that runs `astro build` once for build-output tests).
- [ ] **Step 3:** Run `npm test`. Expected: PASS once the minimal template builds (FAIL first if `globalSetup` isn't wired yet, then wire it).
- [ ] **Step 4:** Add `.github/workflows/check.yml`: Node 26, `npm ci && npm test && npm run build && npm run check`.
- [ ] **Step 5:** `gh repo create richb-hanover/lymefiber-site --private --source . --push`. Start `HANDOFF.md` with a table of account-specific values: GitHub repo, Pages project, Worker name/URL, OAuth app ID, where each value is referenced in the code.
- [ ] **Step 6: Commit and push.** Confirm the Action runs green with `gh run watch`.

---

### Task 2: Snapshot the old site

**Files:**
- Create: `migration/snapshot.mjs`, `migration/snapshot/**`

**Interfaces:**
- Produces: `migration/snapshot/pages/<id>-<slug>.json` (WP REST page object incl. `content.rendered`), `migration/snapshot/html/<slug>.html` (rendered page), `migration/snapshot/uploads/<yyyy>/<mm>/<file>`, `migration/snapshot/old-urls.txt` (one path per line, e.g. `/faq/`, every page, post, category, and upload referenced)

- [ ] **Step 1:** Write `snapshot.mjs`. It fetches `https://www.lymefiber.net/wp-json/wp/v2/pages?per_page=100`, `/posts?per_page=100`, `/categories`, and the three `wp-sitemap-*.xml` files. It saves the rendered HTML of each page and downloads every `wp-content/uploads` file linked from page content. Use `fetch` with a 1 request/second limit and a `User-Agent` naming the project.
- [ ] **Step 2:** Run `node migration/snapshot.mjs`. Expected: 34 page JSON files, 13 files under `uploads/` (11 distinct PDFs incl. both `Phone-LOA.pdf` versions, plus the CSV and `Phone-Service.png`), and `old-urls.txt` with ≥ 34 + 19 + upload paths.
- [ ] **Step 3:** Verify `shasum -a 256` of `uploads/2021/08/Phone-LOA.pdf` = `2420db74…dcd7` (matches spec finding).
- [ ] **Step 4: Commit** `migration/` ("chore: snapshot WordPress site").

---

### Task 3: Data files and schemas

**Files:**
- Create: `src/data/{settings,notice,menu,documents}.yaml`, `src/content.config.ts`, `src/lib/data.ts`, `tests/data.test.ts`

**Interfaces:**
- Produces (`src/lib/data.ts`):
  - `getSettings(): Settings`, where `Settings = Record<'support_phone'|'tollfree_phone'|'support_email'|'transition_email'|'postal_address'|'billing_portal_url'|'phone_portal_url'|'signup_url'|'labels_base_url'|'copyright_name', string>`
  - `getNotice(): { enabled: boolean; level: 'outage'|'maintenance'|'info'; message: string; posted_at?: string }`
  - `getMenu(): MenuItem[]`, where `MenuItem = { label: string; href?: string; external?: boolean; children?: MenuItem[] }`
  - `getDocuments(): Doc[]`, where `Doc = { title: string; description: string; file: string /* "/documents/x.pdf" */; category: 'Policies'|'Phone'|'Customer Forms'; updated: string /* YYYY-MM-DD */ }`
  - Pages collection `pages`: front matter `{ title: string; description: string; permalink: string /* regex ^/([a-z0-9-]+/)*$ */; layout?: 'page'|'home' }`
  - `PERMALINK_PATTERN` exported (reused by CMS config test)

- [ ] **Step 1: Write failing tests:** settings has all 10 keys, non-empty. Initial values exactly: `support_phone: 603-795-0915`, `tollfree_phone: 833-795-5300`, `support_email: support@notices.lymefiber.net`, `transition_email: transition@lymefiber.net`, `postal_address: P.O. Box 323, South Royalton, VT 05068`, `billing_portal_url: https://account.lymefiber.net`, `phone_portal_url: https://portal.gwi.net/`, `signup_url: https://order.lymefiber.net`, `labels_base_url: https://order.lymefiber.net/broadband-facts/`, `copyright_name: LymeFiber LLC`. The menu has exactly the five top-level labels `Plans & Pricing`, `Get Connected`, `Phone Service`, `Support`, `About`, in that order, with the children from spec §5. `PERMALINK_PATTERN` accepts `/`, `/plans/`, `/plans/broadband-labels/` and rejects `/About Us/`, `about-us`, `/plans`.
- [ ] **Step 2:** Run `npx vitest run tests/data.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Create the YAML files and loaders. `notice.yaml` starts `enabled: false`. `documents.yaml` lists the 11 kept files per spec §5 Documents table (titles from the old page link text). Menu hrefs may be `{{token}}` (e.g. Sign Up → `{{signup_url}}`).
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Commit.**

---

### Task 4: Settings tokens

**Files:**
- Create: `src/lib/tokens.ts`, `tests/tokens.test.ts`
- Modify: `astro.config.mjs` (register `remarkSettings`)

**Interfaces:**
- Consumes: `getSettings()`
- Produces: `replaceTokens(text: string, settings: Settings): { text: string; unknown: string[] }` and `remarkSettings(): RemarkPlugin` (replaces in text nodes, link `url`, and image `url`; logs `console.warn('[tokens] unknown token {{x}} in <file>')` for unknowns)

- [ ] **Step 1: Write failing tests:**
  - `replaceTokens('Call {{support_phone}}', s).text === 'Call 603-795-0915'`
  - an unknown `{{supprt_phone}}` is left literally, `unknown` equals `['supprt_phone']`
  - `{{ support_phone }}` with spaces works
  - Markdown `[Pay]({{billing_portal_url}})` processed through remark yields href `https://account.lymefiber.net`
  - `tel:{{support_phone}}` yields `tel:603-795-0915`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement with regex `/\{\{\s*([a-z_]+)\s*\}\}/g`. Unknown tokens never throw.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit.**

---

### Task 5: Outage notice

**Files:**
- Create: `src/lib/notice.ts`, `src/components/NoticeBanner.astro`, `tests/notice.test.ts`

**Interfaces:**
- Consumes: `getNotice()`
- Produces: `shouldShowNotice(n): boolean` (enabled and trimmed message non-empty), `formatPostedAt(iso?: string): string | null` (e.g. `"Posted Dec 9, 4:10 PM"`, America/New_York, `null` if missing or invalid), `<NoticeBanner />` (no props; reads data; renders `<div class="notice notice--{level}" role="status">` with message rendered as inline Markdown, raw HTML escaped)

- [ ] **Step 1: Write failing tests:**
  - `formatPostedAt('2026-12-10T04:30:00Z') === 'Posted Dec 9, 11:30 PM'` (UTC next day → Eastern previous day)
  - `formatPostedAt('2026-11-01T06:30:00Z') === 'Posted Nov 1, 1:30 AM'` (DST boundary)
  - `formatPostedAt(undefined) === null`, `formatPostedAt('garbage') === null`
  - `shouldShowNotice({enabled:true,message:'  '}) === false`, `shouldShowNotice({enabled:false,message:'x'}) === false`
  - Container-API render with message `See [status](/support/) <script>x</script>` contains `<a href="/support/">status</a>` and `&lt;script&gt;`, and does not contain `<script>x`
  - Render with no `posted_at` contains no "Posted"
- [ ] **Step 2:** Run with `TZ=UTC npx vitest run tests/notice.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement with `Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})`. For the message, escape HTML first, then render inline Markdown links/emphasis (e.g. `marked.parseInline` on escaped text, or a small links-only renderer).
- [ ] **Step 4:** Run with `TZ=UTC`. Expected: PASS. Add `TZ=UTC` to the `test` script so the CI matches Cloudflare.
- [ ] **Step 5: Commit.**

---

### Task 6: Wordmark, fonts and favicon

**Files:**
- Create: `scripts/build-wordmark.mjs`, `src/assets/wordmark.svg`, `src/assets/wordmark-reverse.svg`, `public/favicon.svg`, `public/og-image.png`, `public/fonts/SortsMillGoudy-Regular.woff2`, `public/fonts/SortsMillGoudy-Italic.woff2`, `public/fonts/OFL.txt`, `migration/wordmark-compare.html`, `tests/wordmark.test.ts`

**Interfaces:**
- Produces: `src/assets/wordmark.svg` (viewBox tight to the glyphs, two `<path>` groups with fills `#50792d` and `#ab3d12`), `wordmark-reverse.svg` (same paths; "Lyme" in a light green that passes AA on `#004f3e`, "Fiber" in a light coral/red that passes AA on `#004f3e`; builder picks exact values), and font files at `/fonts/…`

- [ ] **Step 1: Write failing tests:** `wordmark.svg` contains no `<text`, no `sodipodi`/`inkscape`, has `role="img"` and `aria-label="LymeFiber"`, contains `#50792d` and `#ab3d12`, and its viewBox aspect ratio is within ±8% of 794/227 (the original PNG).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Get Sorts Mill Goudy TTF + OFL from Google Fonts (`fonts.google.com/specimen/Sorts+Mill+Goudy`). Convert to WOFF2 (e.g. `npx ttf2woff2`). In `build-wordmark.mjs`, use `opentype.js` to lay out "Lyme" and "Fiber" with per-pair kerning offsets (start from the original's tracking: tight, semi-expanded look) and emit the paths.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Write `migration/wordmark-compare.html` showing the old PNG and the new SVG at the same height, stacked and overlaid at 50% opacity. **Show the owner and get approval before continuing** (spec §6).
- [ ] **Step 6:** Make `favicon.svg` (leaf-green "L" on cream) and `og-image.png` (1200×630, cream, wordmark centered).
- [ ] **Step 7: Commit.**

---

### Task 7: Layout, header, footer, styles

**Files:**
- Create: `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/components/{Header,Footer,Breadcrumbs}.astro`, `src/lib/breadcrumbs.ts`, `tests/layout.test.ts`

**Interfaces:**
- Consumes: `getMenu()`, `getSettings()`, `replaceTokens()`, `<NoticeBanner />`, wordmark SVGs
- Produces: `<BaseLayout title description permalink>` slot-based layout, `breadcrumbsFor(permalink: string, titleOf: (p:string)=>string|undefined): {label:string; href:string}[]`

- [ ] **Step 1: Write failing tests:**
  - `breadcrumbsFor('/plans/broadband-labels/', t)` returns Home → Plans & Pricing (`/plans/`) → Broadband Fact Labels. `breadcrumbsFor('/', t)` returns `[]`.
  - Container render of `BaseLayout`: the header contains all five top-level labels. External items have `rel="noopener"` and a visually hidden "(opens external site)". The Sign Up button's href is `https://order.lymefiber.net`. The footer contains `603-795-0915` and links to the Subscriber Agreement, Privacy and AUP PDFs plus `/terms/`. `<title>` is `"{title} | LymeFiber"`. `<meta name="description">`, `<link rel="canonical">` and `og:image` are present.
  - With the notice enabled, the banner is the first element in `<body>` after the skip link.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement per spec §6.
  - Header: white, 3px `#50792d` bottom border. Desktop menus use `<details>`/`<summary>` disclosure for each top-level item, so they work without JS and with the keyboard. Below 860px, a "Menu" button toggles a drawer (≈20 lines of JS, `aria-expanded`). Esc closes it and focus returns to the button.
  - Include a skip link.
  - `global.css`: CSS custom properties for the palette, an `@font-face` for Sorts Mill Goudy with `font-display: swap`, a max-width content column, and focus styles.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit.**

---

### Task 8: Page routes, home, documents, labels table, 404

**Files:**
- Create: `public/robots.txt`, `src/pages/[...slug].astro`, `src/layouts/HomeLayout.astro`, `src/pages/documents.astro`, `src/components/DocumentList.astro`, `src/lib/labels-csv.ts`, `src/components/LabelsTable.astro`, `src/pages/404.astro`, `tests/routes.test.ts`, `tests/labels-csv.test.ts`
- Temporary fixtures: `src/content/pages/home.md`, `src/content/pages/fixture.md` (removed in Task 9)

**Interfaces:**
- Consumes: pages collection, `getDocuments()`, BaseLayout
- Produces:
  - `parseLabelsCsv(csv: string): { columns: string[]; rows: Record<string,string>[] }` (RFC-4180 quoting)
  - `<LabelsTable csvPath="/documents/broadband-facts-labels-2026-03-20-5-51-PM.csv" />`, usable in a page through front matter `labels_csv: <path>`; `[...slug].astro` renders the table after the body when set
  - `<DocumentList />` grouped by category in the order Policies, Phone, Customer Forms; each entry shows the title, description, "PDF · <size> KB · Updated <Mon YYYY>"; an entry whose file is missing in `public/` is omitted with a build warning

- [ ] **Step 1: Write failing tests:**
  - `parseLabelsCsv` on the snapshot CSV returns columns starting with `unique_plan_id` and `provider_name`, and the same number of rows as the snapshot's machine-readable HTML table. A quoted field with a comma parses as one cell.
  - After a build: `dist/index.html` exists from a page with `permalink: /`. `dist/fixture/index.html` exists. `dist/documents/index.html` lists the "Policies" heading before "Phone". `dist/404.html` exists. A `documents.yaml` entry pointing at a nonexistent file does not fail the build and does not appear. `dist/sitemap-index.xml` exists and its sitemap lists `/fixture/` (a page not in the menu). `dist/robots.txt` references the sitemap.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. `getStaticPaths` maps `permalink` → `slug` (`/` → `undefined`). If two pages share a permalink, warn and keep the first one alphabetically by file name; never fail the build. The home layout uses the hero, two buttons (Sign Up → `{{signup_url}}`, See Plans → `/plans/`) and three cards, as in the Village Green mockup (`.superpowers/brainstorm/*/content/visual-style.html`, option A), then renders the body.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit.**

---

### Task 9: Migrate content

**Files:**
- Create: `migration/convert.mjs`, `src/content/pages/*.md` (15 pages), `public/documents/*` (11 PDFs + CSV), `public/images/*`
- Delete: `src/content/pages/fixture.md`

**Interfaces:**
- Consumes: `migration/snapshot/`, `PERMALINK_PATTERN`
- Produces: one Markdown file per row of the spec §5 "Pages to migrate" table, with file names = last path segment (`home.md`, `plans.md`, `broadband-labels.md`, `installation.md`, `exterior.md`, `phone.md`, `support.md`, `faq.md`, `system-upgrade.md`, `contact.md`, `about.md`, `transition.md`, `expansion.md`, `terms.md`); `/documents/` is the route from Task 8

- [ ] **Step 1:** Write `convert.mjs`: turndown with GFM tables. Strip Beaver Builder/Astra wrappers, `<style>`, inline styles and empty elements. Rewrite internal links using the redirect map (Task 10 data, which can be written first as plain YAML). Rewrite `wp-content/uploads/.../x.pdf` → `/documents/x.pdf`. Replace literal contact values with tokens (`603-795-0915` → `{{support_phone}}`, `(833)795-5300` / `833-795-5300` → `{{tollfree_phone}}`, the support email in either case → `{{support_email}}`, `https://account.lymefiber.net` → `{{billing_portal_url}}`, `https://order.lymefiber.net` → `{{signup_url}}`, `https://order.lymefiber.net/broadband-facts/` prefix → `{{labels_base_url}}`). Output drafts to the page files with front matter.
- [ ] **Step 2:** Run it, then hand-edit each page:
  - home: headline "Fiber Internet for Lyme, Orford & Hanover", the "What is LymeFiber?" text and the five Goals.
  - phone: merge in anything unique from `/voip-phone-service/`.
  - broadband-labels: per-plan links plus `labels_csv`, instead of the pasted table.
  - contact: map removed.
  - expansion: rewrite the Orford text to cover Orford and Hanover. The Hanover paragraphs go inside `> **Placeholder — owner to review:** …`.
  - about: from the home "What is LymeFiber?" text and Goals.
- [ ] **Step 3:** Copy the 11 kept files and the CSV from the snapshot into `public/documents/`, keeping their original file names. Use the 2021/08 `Phone-LOA.pdf`.
- [ ] **Step 4: Verify:**
  - `npm run build` succeeds.
  - `grep -r "wp-content\|lymefiber.net/[a-z0-9-]*/\"" dist/ --include=*.html` finds nothing.
  - `grep -rn "{{" dist/ --include=*.html` finds nothing (no unknown tokens).
  - All 15 permalinks from spec §5 exist in `dist/`.
  - Every PDF checksum in `public/documents/` matches the snapshot.
- [ ] **Step 5:** Open `npm run dev` and read every page against the old one in the snapshot HTML. Fix any lost content.
- [ ] **Step 6: Commit.**

---

### Task 10: Redirects and site check

**Files:**
- Create: `src/data/redirects.yaml`, `scripts/gen-redirects.mjs`, `scripts/check-site.mjs`, `tests/redirects.test.ts`
- Modify: `package.json` (`build` = `astro build && node scripts/gen-redirects.mjs`; `check` = `node scripts/check-site.mjs`)

**Interfaces:**
- Consumes: `getSettings()`, `replaceTokens()`, `migration/snapshot/old-urls.txt`, `dist/`
- Produces:
  - `renderRedirects(rules: {from:string; to:string}[], settings): string`: Cloudflare `_redirects` lines `"<from> <to> 301"`, with tokens resolved. Exact paths come before splats.
  - `resolve(path: string, redirectsText: string): string | null`: Cloudflare matching semantics for exact and `*` splat rules; returns the target or `null`.
  - `check-site.mjs` exits 1 and prints a list if any old URL does not resolve to an existing `dist/` file or an `http(s)` URL, any internal `href`/`src` in `dist/**/*.html` 404s, or any `{{token}}` appears in output. The site still deploys; this runs only in the GitHub Action and locally.

- [ ] **Step 1: Write failing tests:**
  - `resolve('/faq/', txt) === '/support/faq/'`
  - `resolve('/faq', txt) === '/support/faq/'` (no trailing slash; generate both forms)
  - `resolve('/2020/11/25/lymefiber-update-november-2020/', txt) === '/'`
  - `resolve('/wp-content/uploads/2021/08/Phone-LOA.pdf', txt) === '/documents/Phone-LOA.pdf'`, and the same for `/wp-content/uploads/2020/11/Phone-LOA.pdf`
  - `resolve('/signupforlymefiberservices/', txt) === 'https://order.lymefiber.net'`
  - `resolve('/lymefiber-dmca-policy/', txt) === '/documents/LymeFiber-Open-Internet-Transparency-Policy-01_01_2022.pdf'`
  - Every line of `old-urls.txt` resolves to non-null
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Write `redirects.yaml` with every row of the spec §5 redirect table. Implement both functions. `gen-redirects.mjs` writes `dist/_redirects`.
- [ ] **Step 4:** Run `npm test && npm run build && npm run check`. Expected: all PASS, check prints `0 problems`.
- [ ] **Step 5: Commit and push.** The GitHub Action is green.

---

### Task 11: Sveltia CMS

**Files:**
- Create: `public/admin/index.html`, `public/admin/config.yml`, `tests/cms-config.test.ts`

**Interfaces:**
- Consumes: data-file shapes from Task 3, `PERMALINK_PATTERN`
- Produces: the CMS at `/admin/`, with collections in this order: `notice` ("Site Notice"), `pages` ("Pages"), `menu` ("Menu"), `documents` ("Documents"), `settings` ("Site Settings")

- [ ] **Step 1: Write failing tests** that parse `config.yml`:
  - backend `name: github`, `repo: richb-hanover/lymefiber-site`, `branch: main`; `publish_mode` is not `editorial_workflow`
  - collection names are in the order above
  - the notice file collection has fields `enabled` (boolean), `level` (select of `outage`/`maintenance`/`info`), `message` (text or markdown), `posted_at` (datetime, default `{{now}}`), and a hint containing "Turn off when resolved"
  - the pages `permalink` field `pattern[0]` equals `PERMALINK_PATTERN.source`
  - each settings field name equals a `Settings` key, all 10 present
  - the documents file widget `media_folder` is `public/documents` with `public_folder: /documents`
  - `media_folder: public/images`
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Write `index.html`, loading Sveltia CMS from unpkg with a pinned exact version. Write `config.yml`. `backend.base_url` stays empty until Task 12, and the test allows that. Set the pages editor preview to use `/styles/global.css` where Sveltia supports it.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Local test:** run `npm run dev`, open `http://localhost:4321/admin/` in Chrome and choose "Work with Local Repository".
  1. Turn the notice on.
  2. Edit a page.
  3. Add a menu child.
  4. Upload a test PDF.
  5. Confirm each change appears in the files and on the dev site.
  6. Revert the test edits.
- [ ] **Step 6: Commit.**

---

### Task 12: Deploy to Cloudflare and connect CMS login

**Files:**
- Modify: `public/admin/config.yml` (`base_url`), `HANDOFF.md`

The owner does the dashboard steps with Claude guiding. Claude never handles passwords or the client secret, other than through `wrangler secret put` run by the owner.

- [ ] **Step 1:** Owner: in Cloudflare, go to Workers & Pages → Create → Pages → Connect to Git, then choose `richb-hanover/lymefiber-site`. Settings: framework Astro, build command `npm run build`, output `dist`, environment variable `NODE_VERSION=26`. Expected: `https://lymefiber.pages.dev` serves the site.
- [ ] **Step 2:** Clone `sveltia/sveltia-cms-auth` into a scratch folder and deploy with `npx wrangler deploy` (the owner logs into wrangler). Record the Worker URL.
- [ ] **Step 3:** Owner: create a GitHub OAuth App (Settings → Developer settings) with homepage `https://lymefiber.pages.dev` and callback `<worker URL>/callback`. Owner runs `npx wrangler secret put GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, then sets `ALLOWED_DOMAINS=lymefiber.pages.dev,lymefiber.net`.
- [ ] **Step 4:** Set `backend.base_url` to the Worker URL. Commit and push.
- [ ] **Step 5: Verify end to end:**
  - Log in at `https://lymefiber.pages.dev/admin/` with GitHub.
  - Turn the notice on with "Test notice" and note the time.
  - Confirm the banner appears on `/` and `/faq/` within 2 minutes, then turn it off and confirm it disappears.
  - Confirm `curl -sI https://lymefiber.pages.dev/faq/` returns `301` with `location: /support/faq/`.
- [ ] **Step 6:** Run Lighthouse (mobile) on `/` and `/plans/`: `npx lighthouse <url> --only-categories=performance,accessibility,best-practices,seo --form-factor=mobile`. Expected: all ≥ 95. Fix and repeat if not.
- [ ] **Step 7:** Fill in `HANDOFF.md`:
  - every account value and where it appears
  - the transfer steps from spec §9: repo transfer, Pages project, Worker, OAuth app, `config.yml` repo, re-invite editors
  - the launch-day DNS steps: add `lymefiber.net` to Cloudflare, attach the custom domain to Pages, and add a Cloudflare redirect rule from `www` to the bare domain. Note: check email (MX) records before changing nameservers.
- [ ] **Step 8: Commit and push.**

---

### Task 13: Editor guide

**Files:**
- Create: `EDITING.md`, `docs/editing-images/*.png`

- [ ] **Step 1:** Write `EDITING.md` with one short section each, with screenshots from the live CMS:
  - Logging in
  - Posting and clearing an outage notice (first)
  - Editing a page
  - Using `{{tokens}}`, with the table of all 10
  - Adding a page, including the URL-path rule
  - Editing the menu
  - Replacing a PDF (keep the same file name)
  - Changing contact info after the WCVT cutover
  - Adding an editor (repo collaborator invite)
  - Undoing a mistake (GitHub history)
- [ ] **Step 2:** Have the owner follow the outage section cold, without help. Fix anything they stumble on.
- [ ] **Step 3: Commit and push.**
