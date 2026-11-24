# Hand-off notes

Everything account-specific is listed here so the site can be handed on.

## Account-specific values

| Value | Current | Referenced in |
|---|---|---|
| GitHub repository | `LymeFiber/lymefiber-site` (public; moved from `richb-hanover/lymefiber-site` on 2026-11-09) | `public/admin/config.yml` (`backend.repo`); `EDITING.md` links |
| Cloudflare Pages project | `lymefiber-site` → https://lymefiber-site.pages.dev, production branch `main` | Cloudflare dashboard |
| Test address | https://test.lymefiber.net (DreamHost DNS: CNAME `test` → `lymefiber-site.pages.dev`) | Pages project → Custom domains |
| Build settings | Framework Astro, build `npm run build`, output `dist`; variables `NODE_VERSION=26`, `SITE_NOINDEX=1` (until launch) | Pages project → Settings |
| Editor login helper (Worker) | `lymefiber-cms-auth` → https://lymefiber-cms-auth.richard-e-brown.workers.dev | `public/admin/config.yml` (`backend.base_url`); source in `cms-auth/` |
| Login helper allowed sites | `lymefiber-site.pages.dev, test.lymefiber.net, lymefiber.net, www.lymefiber.net` | `cms-auth/wrangler.toml` (`ALLOWED_DOMAINS`) |
| GitHub OAuth App | "LymeFiber Site Editor", owned by GitHub user `richb-hanover`; callback `…workers.dev/callback` | Worker secrets `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (set in Cloudflare dashboard) |
| Traffic log database | Cloudflare D1 database `lymefiber-traffic`, bound to the Pages project as `TRAFFIC_DB` (Production and Preview) | Pages project → Settings → Bindings; schema in `functions/schema.sql` |
| Functions failure mode | **Fail open** (if the free daily limit of 100,000 Function requests is reached, the site is served as plain static files: pages and redirects keep working from `dist/_redirects`; only logging stops) | Pages project → Settings → Runtime |
| Cloudflare ↔ GitHub link | GitHub app "Cloudflare Workers and Pages" installed on the **LymeFiber** organization, with `lymefiber-site` under Repository access | github.com/organizations/LymeFiber/settings/installations |

## Launch day (switching lymefiber.net to the new site)

Do this after the WCVT cutover, once managers have approved the test site.

1. **Update Site Settings** in the editor with WCVT's phone numbers, emails, portal and sign-up addresses.
2. **Let search engines in:** in the Pages project, delete the `SITE_NOINDEX` variable, then redeploy (Deployments → ⋯ → Retry).
3. **Move lymefiber.net's DNS to Cloudflare** (Cloudflare → Add a domain → `lymefiber.net`, Free plan):
   - Before changing anything at DreamHost, compare Cloudflare's imported records with DreamHost's DNS page. **Copy every MX, TXT (SPF, DKIM, DMARC) and mail-related record exactly**, or `@lymefiber.net` email will stop.
   - Then change the nameservers at the domain registrar to the two Cloudflare gives you.
4. **Attach the domain:** Pages project → Custom domains → add `lymefiber.net` and `www.lymefiber.net`.
5. **Send www to the bare domain:** Cloudflare → lymefiber.net → Rules → Redirect Rules → `www.lymefiber.net/*` → `https://lymefiber.net/${1}` (301).
6. **Check:** the home page, an old address such as `/faq/` (should redirect), the editor login at `/admin/`, and an email sent to a `@lymefiber.net` address.
7. Update the editor address in `EDITING.md` and the OAuth App's Homepage URL to `https://lymefiber.net`.
8. Optional: remove `test.lymefiber.net` from Custom domains and its CNAME at DreamHost.

## Moving to LymeFiber's own GitHub organization

1. GitHub: repository **Settings → Transfer** to the LymeFiber organization.
2. Update `backend.repo` in `public/admin/config.yml` and the links in `EDITING.md`.
3. Transfer the OAuth App to the organization (OAuth App settings → Transfer ownership), or create a new one and update the two Worker secrets.
4. In Cloudflare, reconnect the Pages project to the moved repository (the GitHub app must have access to it).
5. Re-invite editors as organization members or collaborators.

## Who has access, and how it passes on

**Cloudflare:** each person has their own login; successors are invited as members (decided 2026-11-08).

- The account was created by the project owner with their own login and their own two-factor authentication. Nobody shares a password.
- To add someone: **Manage Account → Members → Invite**, with the **Super Administrator** role. They accept from their email and set up their own two-factor.
- To hand over: invite the successor, confirm they can log in, then they remove the departing person's membership.
- Keep at least two Super Administrators at all times (for example, a second board member), so the account is never locked to one person who becomes unavailable.
- If a login email is on the lymefiber.net domain: when the domain's DNS moves into Cloudflare, copy the email (MX) records exactly, or that login's email could stop working. Each person should keep their own two-factor backup codes.

**GitHub:** editors use their own GitHub accounts, added as collaborators on the repository. Day-to-day editing (outage notices, pages, PDFs) only needs GitHub access, not Cloudflare.

## Traffic report and redirects (Pages Functions)

`functions/_middleware.js` runs in front of every page except build assets (see `public/_routes.json`). It:

1. **Performs the redirects** from `src/data/redirects.yaml`. Cloudflare does not apply `_redirects` to requests that go through Functions, so the build writes the same rules to `functions/_lib/rules.generated.js` (git-ignored) and the middleware uses them, with the same matching code as the build (`functions/_lib/resolve.js`). `dist/_redirects` is still written, as a fallback if Functions stop (fail open).
2. **Logs each redirect and 404** to D1: time, site address, path, status, redirect target and referring page. No IP addresses or browser details. Rows older than 7 days are deleted automatically.

Editors see the log at `/admin/traffic/` (button in the editor). It calls `/api/traffic` (`functions/api/traffic.js`), which only answers people whose GitHub sign-in can push to the repository.

**One-time setup** (already done if the table above has values):

1. Create the database: `npx wrangler@4.158.0 d1 create lymefiber-traffic` (or Cloudflare dashboard → Storage & Databases → D1 → Create).
2. Create the table: `npx wrangler@4.158.0 d1 execute lymefiber-traffic --remote --file functions/schema.sql`.
3. Pages project → Settings → Bindings → Add → D1 database: variable name `TRAFFIC_DB`, database `lymefiber-traffic`. Do this for Production and Preview.
4. Pages project → Settings → Runtime → set **Fail open**.
5. Redeploy (Deployments → ⋯ → Retry) so the binding takes effect.

**Running it locally:**

```
npm run build
npx wrangler@4.158.0 pages dev dist --d1 TRAFFIC_DB
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite < functions/schema.sql   # once
```

(`wrangler d1 execute --local` doesn't work here because the Pages project has no `wrangler.toml` binding.) Then http://localhost:8788/. To see the report locally, call the API with your own GitHub token: `curl -H "Authorization: Bearer $(gh auth token)" localhost:8788/api/traffic`.

**Removing it later** (when old-address traffic has died down):

1. Delete `functions/`, `public/_routes.json`, `public/admin/traffic/`, the `#traffic-link` button in `public/admin/index.html`, the generated-rules lines in `scripts/gen-redirects.mjs`, and the related tests. `dist/_redirects` then handles redirects again on its own.
2. Remove the `TRAFFIC_DB` binding from the Pages project and delete the `lymefiber-traffic` database.

## Change log

### 2026-11-24

- **Traffic report.** A log of 404s and redirects for the last 7 days, visible to editors at `/admin/traffic/`. Redirects are now performed by `functions/_middleware.js` (see [Traffic report and redirects](#traffic-report-and-redirects-pages-functions)).
- **Redirects can be edited in the editor** (Redirects section). The comments at the top of `src/data/redirects.yaml` were replaced by hints in the editor; the editor may drop the group comments inside the file when it saves.
- **System Upgrade FAQ removed.** Its menu link is gone and the old `/system-upgrade-faq/` address now goes to `/support/`. The page text is kept in `document-sources/system-upgrade.md`.

### 2026-11-23

- **Broadband labels are now local PDFs.** The Broadband Fact Labels page links to `/documents/LymeFiber-<Plan name>.pdf` (e.g. `LymeFiber-Residential Basic.pdf`) instead of `order.lymefiber.net/broadband-facts/…`. When a label changes, upload a replacement PDF with the same name. The `labels_base_url` setting was removed (settings file, schema, editor and `EDITING.md`).
- **Links to renamed documents fixed.** The new policy PDFs added earlier today dropped the old dates and suffixes from their names, and the originals moved to `public/documents/OLD/`. Links in pages, the menu and the Documents list now point at the current files: Contractor List, Telephone User Guide, Phone Letter of Agency, Power Outages and Phone Service, E911 Disclaimer and Privacy Policy.
- **The site no longer links to the old WordPress site.** The only `lymefiber.net` addresses left are the sign-up (`order.lymefiber.net`) and billing (`account.lymefiber.net`) systems in Site Settings, `@lymefiber.net` email addresses, and the site's own future address.
- **Planned-maintenance banner is yellow** (dark text). Outage stays red and General notice stays green.
