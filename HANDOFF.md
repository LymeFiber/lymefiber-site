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

**Cloudflare:** each person has their own login; successors are invited as members (decided 2026-11-08).

- The account was created by the project owner with their own login and their own two-factor authentication. Nobody shares a password.
- To add someone: **Manage Account → Members → Invite**, with the **Super Administrator** role. They accept from their email and set up their own two-factor.
- To hand over: invite the successor, confirm they can log in, then they remove the departing person's membership.
- Keep at least two Super Administrators at all times (for example, a second board member), so the account is never locked to one person who becomes unavailable.
- If a login email is on the lymefiber.net domain: when the domain's DNS moves into Cloudflare, copy the email (MX) records exactly, or that login's email could stop working. Each person should keep their own two-factor backup codes.

**GitHub:** editors use their own GitHub accounts, added as collaborators on the repository. Day-to-day editing (outage notices, pages, PDFs) only needs GitHub access, not Cloudflare.
