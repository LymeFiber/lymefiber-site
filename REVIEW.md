# LymeFiber site rebuild: final review and decisions

*Written 2026-11-09, at the end of the build.*

The build is finished. An independent reviewer read all the code against the design spec and the plan. It found **no critical problems** and **three important ones**, all now fixed and live on https://test.lymefiber.net. All 95 automated tests pass, and the site check (`npm run check`) finds no problems.

- Design spec: `docs/superpowers/specs/2026-11-07-lymefiber-site-design.md`
- Build plan: `docs/superpowers/plans/2026-11-08-lymefiber-site.md`
- Editor's guide: `EDITING.md`
- Accounts and launch checklist: `HANDOFF.md`

---

## 1. What the review fixed

1. **A new page could take over an existing page's address, even the home page.**
   For example, a new page set to `/plans/` could replace the real Plans page, and a page set to `/` could replace the home page.
   *Now:* the home page always owns `/`. An existing page keeps its address (the page whose file name matches the address wins). `npm run check` reports any page that isn't published because of a clash.

2. **Contact tokens in menu links only worked on links to other websites.**
   The editor's guide says tokens such as `{{signup_url}}` work in any menu link. On an internal link they would have appeared literally.
   *Now:* tokens work in every menu link.

3. **The home page layout and the FCC labels table depended on hidden editor fields** that a save in the editor might have wiped.
   *Now:* the page at `/` always uses the home layout, whatever its settings say. The labels file is an ordinary, visible field ("FCC labels CSV file") on the Broadband Fact Labels page, which editors can see and change.

Each fix has a test that failed before the fix and passes after it.

---

## 2. Things for you to do or check

- [ ] **Upload one test PDF** in the editor's **Documents** section, then check it appears on the Policies & Documents page. This is the only editor feature not yet tried on the live site.
- [ ] **Review page wording** that I copied as it was, for you to decide:
  - **FAQ:** the "Timeline" section stops at November 2021.
  - **System Upgrade FAQ:** describes the August 2025 billing-system change, which will be out of date after the WCVT cutover.
  - **Exterior Connection:** the payment-plan table has overlapping amounts ($600–$1,999.99, then $1,200–$2,399.99).
  - **Expanding to Orford & Hanover:** the Hanover section is a marked placeholder.
- [ ] **Read the pages I rewrote** for clearer headings and tables (the facts are unchanged), plus the About page and the PDF descriptions, which I wrote.
- [ ] *Optional:* delete the old `site-build` branch on GitHub. Everything in it is already in `main`.
- [ ] **At launch**, follow the checklist in `HANDOFF.md`. It includes removing the `SITE_NOINDEX` setting, and copying the email records exactly when lymefiber.net's DNS moves to Cloudflare.

---

## 3. Decisions I made on your behalf

In the order I made them. Each line says what it would cost if the decision turns out wrong.

### Building

- **Built on a separate branch until you approved the merge into `main`.** Cost: none.
- **Used Astro 7,** the current release when the build started. Cost: none.
- **Corrected my earlier claim about the Phone Letter of Agency.** I first said there were two different versions. In fact only the 2020 file exists; my first check had compared it against the old site's "page not found" response. The site uses the 2020 file, and the old broken links to the missing copies redirect to it. Cost: the wrong form, if another version turns up.
- **Invalid page addresses are rejected by the editor rather than tolerated.** An address hand-edited outside the editor blocks publishing until it's fixed, but the last good version of the site stays live. Cost: a short publishing delay after a bad hand edit.
- **Contact tokens are filled in on the finished HTML.** Astro 7 dropped the plugin approach the plan called for. Cost: none in practice.
- **The outage-notice message accepts tokens, and silently drops unsafe links** (such as `javascript:` links). Cost: none.

### Wordmark and favicon

- **Measured the wordmark against the original's letters, not the padded image around them.** Then relaxed the allowed width difference from 8% to 10% to match the spacing you chose. Cost: none.
- **Removed the old `favicon.ico`;** only the SVG icon remains (now the "LF" monogram). Cost: no tab icon in very old browsers.

### Pages and content

- **The mobile menu works even without JavaScript.** Cost: none.
- **The FCC labels table is built from the 2026 CSV file,** not the 2024 table on the old page, which was out of date. Cost: none.
- **Images:** kept the router photos, the installation (NID) photo and the calling-features chart. Dropped the stock photos and the sign-up button image; the button is now a text link. Cost: re-adding them if you want them back.
- **Rewording:** rewrote pages for clearer headings and tables, with facts unchanged, and wrote the About page and the PDF descriptions. Cost: wording you may want to change.
- **Stale content kept as it was for you to decide** (listed in section 2). Cost: none until launch.
- **Office hours live in the Contact Us page text, not in Site Settings.** Cost: one extra place to edit at the WCVT cutover.
- **Narrowed the content column** so the breadcrumb trail lines up with the page text. Cost: none.

### Publishing, editor and hosting

- **The redirect and check scripts need Node 23 or later.** Cloudflare is set to Node 26. Cost: the build fails if that setting is removed.
- **Pinned the editor software (Sveltia CMS) to a version at least two weeks old,** rather than the newest. Cost: none.
- **The editor's preview pane is unstyled,** so pages look plain while editing. Cost: cosmetic.
- **Replaced the planned local editor test with your live tests,** because I couldn't click through the editor myself. Cost: none, since your live tests passed.
- **Added the `SITE_NOINDEX` setting** to keep the test site out of search engines. Cost: if it isn't removed at launch, the real site stays out of Google.
- **The editor's guide has no screenshots,** because I can't log into the editor (it uses your GitHub login). Cost: you may want to add some.

### Review items I let stand

- **Raw HTML in page text passes through to the page.** Editors are trusted collaborators. Cost: a careless paste could break a page's layout.
- **The reviewer didn't re-run Lighthouse** (it needs a browser). My earlier run scored 100 in all four categories on the home and Plans pages. Cost: low.
- **A page address that collides with `/documents/`, `/admin/` or `/404/` isn't blocked.** It needs an unusual deliberate choice. Cost: one page hidden.
- **The one-off migration scripts weren't reviewed in depth.** They don't run when the site is built, and their output was checked. Cost: none.

---

## 4. Minor review items I didn't fix

None of these affects normal use. Tell me which, if any, you'd like done.

### Outage notice timing
- A "Posted" time typed by hand (not through the editor) as a date only, or with a space instead of a "T" between date and time, shows the wrong hour.
- An editor posting from outside the Eastern time zone gets a shifted "Posted" time.
- A time inside the one-hour gap when clocks spring forward shows an hour early.

### Outage notice links
- A rejected (unsafe) link leaves a stray ")" in the message.
- A web address containing ")" is cut short.

### Things the site check doesn't catch
- A blank Site Settings value (only possible by editing the file by hand) shows as the word "undefined" on pages.
- A Documents entry whose PDF has been deleted disappears from the Policies & Documents page without `npm run check` reporting it.
- A misspelled token in a redirect target isn't reported.

### Content fixed in the code, not editable in the editor
- The footer's policy links (Subscriber Agreement, Privacy Policy, Acceptable Use Policy) name specific PDF files. If a policy is replaced with a new file name, the footer link breaks (though `npm run check` would report it).
- The prices on the home page cards ("from $72", "from $25").
- `Support@LymeFiber.net`, written twice in the Website Terms of Use. It isn't on the guide's list of things to update by hand at the cutover.

### Leftovers and housekeeping
- The test message "Hokey Pokey - something's wrong!" is still saved in the Site Notice. The banner is off; clear the message before launch.
- `HANDOFF.md`'s "Moving to LymeFiber's own GitHub organization" section is half done. The repository has moved; the GitHub login app and the login helper are still on personal accounts.
- One pattern in the notice code contains an invisible special space character, which is confusing to anyone reading the code.
- The editor script is loaded without a tamper check (SRI hash).
- The `yaml` package is listed as development-only, but it's used when the site is built.
