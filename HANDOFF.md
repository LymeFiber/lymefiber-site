# Hand-off notes

This site was built in temporary accounts. Everything account-specific is listed here so it can move to LymeFiber's own accounts.

## Account-specific values

| Value | Current (temporary) | Referenced in |
|---|---|---|
| GitHub repo | `richb-hanover/lymefiber-site` (private) | `public/admin/config.yml` (`backend.repo`) |
| Cloudflare Pages project | `lymefiber` → `https://lymefiber.pages.dev` (not yet created) | Cloudflare dashboard; `ALLOWED_DOMAINS` on the auth Worker |
| CMS auth Worker | not yet deployed | `public/admin/config.yml` (`backend.base_url`) |
| GitHub OAuth App | not yet created | Worker secrets `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
