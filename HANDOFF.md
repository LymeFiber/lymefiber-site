# Hand-off notes

This site was built in temporary accounts. Everything account-specific is listed here so it can move to LymeFiber's own accounts.

## Account-specific values

| Value | Current (temporary) | Referenced in |
|---|---|---|
| GitHub repo | `richb-hanover/lymefiber-site` (private) | `public/admin/config.yml` (`backend.repo`) |
| Cloudflare Pages project | `lymefiber` → `https://lymefiber.pages.dev` (not yet created) | Cloudflare dashboard; `ALLOWED_DOMAINS` on the auth Worker |
| CMS auth Worker | not yet deployed | `public/admin/config.yml` (`backend.base_url`) |
| GitHub OAuth App | not yet created | Worker secrets `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |

## Who has access, and how it passes on

**Cloudflare:** one shared login owned by the organization (decided 2026-11-08).

- Login email: `richard.e.brown@lymefiber.net`
- The password and the two-factor codes are kept in a shared password manager or with LymeFiber's records, never in this repository.
- To hand over: give the successor the password-manager entry (password + two-factor codes + backup codes). Optionally, they can also be invited as a Super Administrator member under **Manage Account → Members** so they have their own login.
- Caution: the login email is on the lymefiber.net domain. When the domain's DNS moves into Cloudflare, copy the email (MX) records exactly, or this login's email could stop working. Keep the two-factor backup codes somewhere separate as a fallback.

**GitHub:** editors use their own GitHub accounts, added as collaborators on the repository. Day-to-day editing (outage notices, pages, PDFs) only needs GitHub access, not Cloudflare.
