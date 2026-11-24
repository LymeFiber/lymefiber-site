# Site search — design (short)

Date: 2026-11-24 · Status: approved by Rich 2026-11-24

**Intent:** let visitors find information across the site's ~14 pages, and show editors what people search for but can't find (fits the traffic-report goal of finding missing pages).

**Decided by Rich:** Pagefind; a magnifying-glass button in the header that drops down a text box; log searches that find nothing; ignore PDF contents.

**Approaches:** Pagefind with its ready-made Default UI (built for a full search page; hard to fit in a dropdown; doesn't expose "no results" for logging) vs. **Pagefind's JS API with a small custom results list (chosen)**. Google Programmable Search (branding/ads, needs public indexing) and hosted search (Algolia, Cloudflare AI Search) were ruled out as excess for 14 pages.

**Design**
- Build: `pagefind --site dist` after `astro build`. Index only `<main>` (`data-pagefind-body`), breadcrumbs ignored, 404 page not indexed. `/pagefind/*` excluded from Functions in `public/_routes.json`.
- Header: magnifier button (between the menu and Sign Up on desktop; next to Menu on phones) opens a panel under the header with a focused text box. Results as you type (max 8: title + highlighted excerpt); ↑/↓/Enter; Enter alone opens the top result; Esc / outside click / button closes. Hidden without JavaScript. In `astro dev` (no index) the panel says search works on the built site.
- No-result logging: when a query (trimmed, ≥ 3 characters) has 0 results and the visitor pauses 2 s, presses Enter, or closes the panel, send the final query once per distinct query per page view (`navigator.sendBeacon`) to `POST /api/search-miss`. Stored in D1 table `searches(ts, host, query)` (query ≤ 100 chars), 7-day retention, in `lymefiber-traffic`. The endpoint is public, accepts only small JSON, and never fails the visitor.
- Traffic report: third table "Searches that found nothing" — count, search text (grouped case-insensitively), last seen.
- Docs: HANDOFF (Pagefind, table, removal), EDITING (report section).

**Calls by Claude:** custom UI over Default UI; 2 s pause; ≥ 3 characters; grouping case-insensitive; two magnifier buttons in markup (desktop one inside the nav, phone one beside Menu) controlling one panel, so the desktop position between menu and Sign Up works without restructuring the nav.

**Left to the builder:** exact styling within the site's existing header look.
