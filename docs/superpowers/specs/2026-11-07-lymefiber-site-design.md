# LymeFiber.net Rebuild — Design

Date: 2026-11-07
Owner: richb.hanover@gmail.com
Status: Approved 2026-11-08

## 1. Intent

LymeFiber.net runs today on WordPress (Astra theme, Beaver Builder, Simple Banner, PDF Embedder). It is hard to maintain for a site that changes rarely. We are replacing it with a static site built from Markdown files, edited through a web-based GUI, with a modernized "Village Green" look.

The new site is the one that goes live **after the December 2026 cutover** to the new network operator, WCVT (Waitsfield and Champlain Valley Telecom). The content is expected to stay mostly static for a year or two.

### Who visits, and why
LymeFiber already serves about 65% of possible subscribers, so traffic is low and the site is a reference and status page, not a sales funnel. The main visitors are:
1. **Existing customers checking for outages**: the outage banner has to be prominent and easy to post.
2. **Prospective subscribers** who want to sign up, now including Orford and Hanover.
3. **People looking for terms, pricing, policies and FCC broadband labels.**

## 2. Goals, non-goals, anti-goals

**Goals**
- Page content stored as **Markdown** files in a Git repo, so it can be edited in the web GUI or in a text editor with the same result.
- A **web GUI** for adding and editing pages, editing menus, uploading PDFs and images, and posting a site-wide outage banner.
- A **site-wide outage banner** that a non-developer can turn on or off from a desktop browser, live within about two minutes.
- **Preserve the red/green LymeFiber wordmark.**
- **Reorganized, discoverable menus** (today most content is reachable only from the footer).
- A modern, responsive, accessible presentation that works well on phones.
- **No broken inbound links**: every old WordPress URL redirects somewhere sensible.

**Non-goals**
- No sign-up/order system. Sign-up links go to an external ordering site (today `order.lymefiber.net`; the owner will repoint to WCVT by hand).
- No blog or news section. The 19 existing news posts are dropped.
- No live network monitoring or automatic outage detection. The banner is posted by hand.
- No converting the policy PDFs to HTML. PDFs stay the official versions.
- No contact form. Contact is by phone and email, as today.
- No editing UI for site-wide styling or layout. That stays in code.

**Anti-goals (would count as failure even if it "works")**
- Anything that recreates WordPress-style upkeep: a server to patch, a database, plugins needing updates.
- An outage banner that is hard to find, slow to publish, or easy to leave stale. The banner shows its posted time.
- A wordmark whose colors, letter proportions or layout drift from the current one. (The typeface moves to Sorts Mill Goudy on purpose; see §6.)
- Contact details or portal links duplicated across many pages, so the WCVT change becomes a hunt.

## 3. Decisions made

| Area | Decision | Who decided |
|---|---|---|
| Source format | Markdown (with YAML front matter) | Owner |
| Repo / hosting | GitHub repo + Cloudflare Pages, auto-deploy on push to `main` | Owner (on Claude's recommendation) |
| Editor login | Editors use their own GitHub accounts, added as repo collaborators | Owner |
| Who posts outages | Staff/volunteers at a desktop browser | Owner |
| Visual direction | "Village Green" (see §6) | Owner, from mockups |
| Launch timing | Goes live after the WCVT cutover | Owner |
| Policies | Kept as PDFs, served as-is; replaced by uploading a new PDF | Owner |
| News posts | All 19 dropped | Owner |
| Empty / duplicate / draft pages | Dropped | Owner |
| Old URLs | 301-redirect every old WordPress URL | Owner |
| Orford page | Becomes "Expanding to Orford & Hanover" | Owner |
| Sign-up links | Owner repoints them to WCVT by hand | Owner |
| Static site generator | **Astro** | Claude's call |
| Web GUI | **Sveltia CMS** (Git-based, Decap-compatible config) at `/admin` | Claude's call |
| CMS auth | GitHub OAuth through the small Cloudflare Worker `sveltia-cms-auth` | Claude's call |

## 4. Architecture

```
Editor (browser) ──► lymefiber.net/admin (Sveltia CMS, static JS)
                        │  GitHub OAuth via Cloudflare Worker
                        ▼
                  GitHub repo (Markdown, YAML, PDFs, images)
                        │  push to main
                        ▼
                  Cloudflare Pages build (astro build) ──► static HTML on lymefiber.net
```

- **No runtime server code** apart from the OAuth worker. Every page is static HTML.
- **Every save in the CMS is a Git commit** to `main`, so history and rollback come free through GitHub.
- **Build time:** a full rebuild should finish in under about 2 minutes, which bounds how long an outage banner takes to appear.
- **Branch previews:** Cloudflare Pages preview deploys on non-`main` branches are available to developers. The CMS publishes straight to `main`, with no editorial-workflow drafts, to keep outage posting one step.

### Content model (files the CMS edits)

| Collection | Location | Fields |
|---|---|---|
| Pages | `src/content/pages/**/*.md` | title, description (SEO), slug/path, body (Markdown); optional `hero` flag for the home page |
| Site Notice (banner) | `src/data/notice.yaml` | `enabled` (bool), `level` (outage / planned maintenance / info), `message` (short Markdown, links allowed), `posted_at` (datetime, defaults to now) |
| Menu | `src/data/menu.yaml` | ordered top-level items, each with label and either a link or a list of children (label + internal path or external URL); `external` flag shows ↗ |
| Site Settings | `src/data/settings.yaml` | support phone(s), toll-free number, support email, postal address, billing portal URL, phone portal URL, sign-up/order URL, broadband-labels base URL, footer copyright name |
| Documents | `public/documents/*.pdf` + `src/data/documents.yaml` | title, short description, file, category (Policies / Customer Forms / Phone), "updated" date |

**Settings are referenced, not copied.** Page bodies and layouts use the Settings values (through components or a small token like `{{support_phone}}` that the build replaces) so the WCVT changeover means editing one file. Which mechanism to use is the builder's call; it must work for Markdown edited in the CMS.

### Outage banner behavior
- When `enabled: true`, the banner appears at the top of **every** page, above the header.
- Red (`#ab3d12`) background for outage / planned maintenance. A calmer style for "info" (builder's call within the palette).
- Shows the message and "Posted <date, time>" in Eastern time.
- Not dismissible (it's operational information), compact on mobile.
- The CMS "Site Notice" screen is the first item in the CMS sidebar, labeled plainly, with the on/off switch at the top.

## 5. Information architecture

### Top menu (initial contents of `menu.yaml`)

- **Plans & Pricing**
  - Service Plans & Pricing → `/plans/`
  - Broadband Fact Labels → `/plans/broadband-labels/`
- **Get Connected**
  - Sign Up ↗ → Settings `signup_url`
  - Installation & Scheduling → `/connect/installation/`
  - Exterior Connection → `/connect/exterior/`
  - Contractor List & Specs (PDF) → `/documents/LymeFiber-Contractor-List-and-UG-Specs-.pdf`
- **Phone Service**
  - VoIP Phone Service → `/phone/`
  - Telephone User Guide (PDF)
  - Power Outages & Phone Service (PDF)
  - E911 Disclaimer (PDF)
  - Phone Letter of Agency (PDF)
- **Support**
  - Support home (billing portal instructions + contact summary) → `/support/`
  - FAQ → `/support/faq/`
  - System Upgrade FAQ → `/support/system-upgrade/`
  - Contact Us → `/support/contact/`
  - Billing Portal ↗ → Settings `billing_portal_url`
  - Phone Portal ↗ → Settings `phone_portal_url`
- **About**
  - About LymeFiber → `/about/`
  - 2027 Transition → `/about/transition/`
  - Expanding to Orford & Hanover → `/about/expansion/`
  - Policies & Documents → `/documents/`

A persistent **Sign Up** button sits in the header (desktop) and the mobile menu.

**Footer:** contact block (from Settings), quick links (FAQ, Documents, Contact), policy links straight to the Subscriber Agreement, Privacy Policy and Acceptable Use Policy PDFs, plus Website Terms of Use, and a copyright line.

### Pages to migrate (content carried over from the current site)

| New path | Source (old WordPress page) | Notes |
|---|---|---|
| `/` | Home | Hero headline becomes "Fiber Internet for Lyme, Orford & Hanover". Keep the "What is LymeFiber?" text and the five Goals. Three cards: Plans, Getting Connected, Support. |
| `/plans/` | `/service-plans-pricing-2/` | Current published version (not the draft) |
| `/plans/broadband-labels/` | `/internet-broadband-fact-labels/` + `/machine-readable-labels/` | Links to each plan's label plus a link to the CSV. The machine-readable table is **rendered at build time from the CSV** in `public/documents/`, so replacing the CSV updates the page. Label link base URL comes from Settings. |
| `/connect/installation/` | `/1250-2/` ("Getting Connected") | |
| `/connect/exterior/` | `/conduit-drops/` | |
| `/phone/` | `/voip-phone-service-2/` | The newer of the two VoIP pages (2022). Fold in anything unique from `/voip-phone-service/`. |
| `/support/` | `/lymefiber-billing-portal/` | Billing-portal guidance, phone and email from Settings |
| `/support/faq/` | `/faq/` | |
| `/support/system-upgrade/` | `/system-upgrade-faq/` | |
| `/support/contact/` | `/contact-us/` | Contact details from Settings. Keep the map only if it shows the right office after the cutover (see §9). |
| `/about/` | Home "What is LymeFiber?" / Goals | Short about page |
| `/about/transition/` | `/transition/` | |
| `/about/expansion/` | `/orford/` | Rewrite to cover Orford **and Hanover**. Hanover text is a clearly marked placeholder for the owner to review. |
| `/documents/` | `/customer-documents/` + `/policies-and-procedures/` | Generated from `documents.yaml`, grouped by category |
| `/terms/` | `/terms-of-service/` | This is the *website* terms of use (HTML only, about 3,200 words), not the subscriber agreement. Kept as a Markdown page titled "Website Terms of Use". |

**Migration source (Claude's call):** the live site, through the WordPress REST API (`/wp-json/wp/v2/pages`) and the WP sitemaps, plus direct downloads of the files in `wp-content/uploads`. The first build step snapshots everything (page JSON, rendered HTML, PDFs, CSV, images and the full list of old URLs) into `migration/snapshot/` in the repo. Nothing after that depends on the old WordPress site staying up. That URL list is what the redirect check tests against. "Current published version" for `/plans/` means WordPress page ID 1445 (`/service-plans-pricing-2/`); page 2184 is the draft.

Content conversion: HTML → Markdown, stripping Beaver Builder/Astra markup, inline styles and empty spans. Internal links are rewritten to the new paths. Images used in content move to `public/images/`.

### Documents (copied as-is to `public/documents/`)

| File | Category |
|---|---|
| LymeFiber_Subscriber_Agreement_and_Terms-01_01_2022.pdf | Policies |
| LymeFiber-Privacy-Policy-01_01_2022.pdf | Policies |
| LymeFiber-Acceptable-Use-Policy.pdf | Policies |
| LymeFiber-Open-Internet-Transparency-Policy-01_01_2022.pdf | Policies |
| LymeFiber-DMCA-Policy-.pdf | Policies |
| E911-Legal-Disclaimer-1.pdf | Phone |
| Power-Outages-and-LymeFiber-Phone-Service.pdf | Phone |
| LymeFiber-Telephone-Service-Users-Guide-Jan.26.2022.pdf | Phone |
| Phone-LOA.pdf (2021/08 version) | Customer Forms |
| Installation-Letter-Of-Permission.pdf | Customer Forms |
| LymeFiber-Contractor-List-and-UG-Specs-.pdf | Customer Forms |
| broadband-facts-labels-2026-03-20-5-51-PM.csv | (FCC labels, not listed in Documents) |

The 2020/11 and 2021/08 `Phone-LOA.pdf` files differ (checked by SHA-256). Keep the 2021/08 version, which is the one the current LOA page links to. Redirect the 2020/11 URL to it.

### Dropped
- Pages: Service Plans & Pricing (Draft), signup-successful, Career Opportunities (empty), Telephone Service Order (empty), Electronic Signature – Phone LOA (empty), the duplicate Sign Up page, the duplicate VoIP page, and the duplicate LOA page.
- All 19 news posts and the category archive pages.

### Redirects (Cloudflare Pages `_redirects`, all 301)

| Old path | New target |
|---|---|
| `/service-plans-pricing-2/`, `/service-plans-pricing-draft/` | `/plans/` |
| `/internet-broadband-fact-labels/`, `/machine-readable-labels/` | `/plans/broadband-labels/` |
| `/signupforlymefiberservices/`, `/sign-up-for-lymefiber/`, `/signup-successful/` | sign-up URL from Settings (generated at build) |
| `/1250-2/` | `/connect/installation/` |
| `/conduit-drops/` | `/connect/exterior/` |
| `/voip-phone-service/`, `/voip-phone-service-2/`, `/current-internet-subscriber-requesting-phone-service/` | `/phone/` |
| `/faq/` | `/support/faq/` |
| `/system-upgrade-faq/` | `/support/system-upgrade/` |
| `/contact-us/` | `/support/contact/` |
| `/lymefiber-billing-portal/` | `/support/` |
| `/transition/` | `/about/transition/` |
| `/orford/` | `/about/expansion/` |
| `/career-opportunities/` | `/about/` |
| `/customer-documents/`, `/policies-and-procedures/` | `/documents/` |
| `/terms-of-service/` | `/terms/` |
| `/privacy-policy/` | Privacy Policy PDF |
| `/lymefiber-subscriber-agreement-2/` | Subscriber Agreement PDF |
| `/lymefiber-acceptable-use-policy/` | AUP PDF |
| `/lymefiber-dmca-policy/` | Open Internet Transparency Policy PDF (that page's actual title) |
| `/lymefiber-e911-legal-disclaimer/` | E911 PDF |
| `/power-outages-and-phone-service/` | Power Outages PDF |
| `/telephone-user-guide/` | Telephone User Guide PDF |
| `/phone-letter-of-agency/`, `/phone-letter-of-agency-loa/` | Phone LOA PDF |
| `/installation-letter-of-permission-2/` | Letter of Permission PDF |
| `/underground-specs-and-contractor-list/` | Contractor List PDF |
| `/wp-content/uploads/*/<file>.pdf` and `.csv` | `/documents/<file>` (every file in the Documents table) |
| `/YYYY/MM/DD/*` (news posts), `/category/*`, `/feed/*` | `/` |
| `www.lymefiber.net/*` | `lymefiber.net/*` (canonical host is the bare domain; builder's call if a Cloudflare rule is simpler) |

## 6. Visual design: "Village Green"

Chosen from three mockups (Village Green, Clean Utility, Bold Landscape). Mockup HTML: `.superpowers/brainstorm/*/content/visual-style.html`, option A.

- **Palette (from the wordmark):**
  - Red `#ab3d12`: outage banner, rare emphasis
  - Dark green `#004f3e`: headings, nav text, footer background
  - Leaf green `#50792d`: buttons, active nav underline, accents
  - Cream `#faf7f0` page background; white content cards; text `#2b2b2b`
  - Check every text/background pair for WCAG AA contrast.
- **Type:** headings in **Sorts Mill Goudy** (free, SIL Open Font License, self-hosted WOFF2), the same typeface as the wordmark, so the logo and headings match exactly (owner's decision). Body in a clean sans (system stack or a self-hosted free font). Long pages stay in a readable column of about 70 characters.
- **Header:** white bar, wordmark top-left, five dropdown menus, Sign Up button, 3px leaf-green bottom rule. On mobile, a menu button opening an accessible drawer with expandable sections.
- **Home:** centered serif headline, one-line value statement, Sign Up + See Plans buttons, three cards, then the "What is LymeFiber?" text and Goals.
- **Inner pages:** serif page title, breadcrumb, single column. Documents page as a grouped list with PDF icon, size and updated date.
- **Footer:** dark green, contact info from Settings, policy links.
- **Dark mode:** not required.

### Wordmark
- Source: `/Users/richb/Documents/Projects/LymeFiber_Files/Website Materials/LymeFiberImages/LF Logo/LymeFiber Logo-path.svg`. Despite its name it holds **live text**: "Lyme" in `#50792d` and "Fiber" in `#ab3d12`, Goudy Old Style, semi-expanded, with manual kerning (`dx`) adjustments.
- **Re-set the wordmark in Sorts Mill Goudy** (owner's decision, 2026-11-08) so it uses the same free font as the site headings. Do not use the licensed Microsoft Goudy Old Style. Keep the same words, colors ("Lyme" `#50792d`, "Fiber" `#ab3d12`) and relative size. Adjust the letter spacing by eye to match the tight kerning of the original as closely as Sorts Mill Goudy allows.
- Build a clean, outlined SVG (text → paths) from the Sorts Mill Goudy font file. Strip Inkscape/sodipodi metadata, set a tight `viewBox`, add `role="img"` and `aria-label="LymeFiber"`. Also produce a light (reverse) variant for dark backgrounds.
- Verify by overlaying it on `LymeFiber Logo.png` (794×227) from the same folder. Overall width/height ratio, word spacing and colors should match closely. Small letterform differences from the font change are expected. Show the owner the old and new side by side before using it.
- Also produce a favicon (an "LF" monogram or the "L" in green; builder's call) and a social-share image.

## 7. CMS (Sveltia) configuration

- Lives at `/admin/` (`public/admin/index.html` + `config.yml`).
- Backend: GitHub, repo TBD (see §9), branch `main`, OAuth through the `sveltia-cms-auth` Cloudflare Worker.
- Sidebar order: **Site Notice**, Pages, Menu, Documents, Site Settings.
- Site Notice: a single-file collection with a boolean toggle, a select for level, a short text/Markdown message, and a datetime defaulting to now. Include a one-line hint: "Turn off when resolved."
- Pages: a folder collection with nested paths. The Markdown editor uses the live preview styled with the site CSS where practical.
- Documents: file widget that uploads to `public/documents/`, plus title, description, category and date. Replacing a policy = uploading the new PDF and pointing the entry to it. Keeping the same filename is preferred, so links stay stable.
- Media for page images: `public/images/`.
- A short **EDITING.md** in the repo explains, with screenshots: logging in, posting/clearing an outage, editing a page, editing the menu, replacing a PDF, changing contact info, and adding a new editor (GitHub collaborator invite).

## 8. Quality bar

- Lighthouse ≥ 95 for Performance, Accessibility, Best Practices and SEO on home and one inner page (mobile).
- No client-side JS needed to read content. Only the mobile menu uses a small amount of JS, and the CMS is JS-only.
- Valid `sitemap.xml`, `robots.txt`, canonical URLs, page titles and meta descriptions, and an Open Graph image.
- An automated check in CI (or a build script) that every old URL in the redirect table returns 301 to a 200 page, and that the site has no internal broken links.
- A custom 404 page in the site style, with search hints and menu.

## 9. Open items for the owner (do not block the build)

- **Content at cutover (decided 2026-11-08):** prices, plans, FCC labels and policy PDFs do **not** change at the cutover. Migrate them as they are. Only contact details and portal/sign-up links change, and those live in Settings. If WCVT later moves the hosted label pages off `order.lymefiber.net`, changing the label base URL in Settings repoints every label link.
- **WCVT values for Settings:** support phone/email, billing portal URL, phone portal URL, sign-up/order URL, broadband-label link base, mailing address. Launch with the current values; the owner updates Settings after the cutover.
- **Hanover expansion text:** placeholder until the owner supplies the details.
- **Contact page map:** the current embed shows South Royalton, VT (ValleyNet). After the cutover, either show WCVT's office or remove the map. Default: remove it.
- **DNS:** where `lymefiber.net` DNS is managed today, and who can change it for the Cloudflare Pages cutover.
- **Accounts (decided 2026-11-08):** build in a temporary private GitHub repo under the owner's personal account and the owner's own Cloudflare account. The plan ends with a hand-off step: transfer the repo to the LymeFiber GitHub org, move or re-create the Cloudflare Pages project and the OAuth Worker, update the CMS `config.yml` repo name and the OAuth app callback, and re-invite editors. Keep every account-specific value in one documented place so the hand-off is mechanical.
- **Initial editors:** who they are (their GitHub usernames).

## 10. Left to the builder

- Project scaffolding and Astro version, CSS approach (plain CSS with custom properties is fine), font choices within §6.
- How Settings values get into Markdown bodies.
- Exact component structure, breadcrumb implementation, mobile-menu implementation (must be keyboard- and screen-reader-accessible).
- HTML → Markdown conversion tooling for the migration (a one-off script, not kept in the build).
- Favicon and social image design within the palette.
