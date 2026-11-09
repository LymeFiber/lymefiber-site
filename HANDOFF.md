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
