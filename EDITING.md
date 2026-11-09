# Editing the LymeFiber website

This guide is for anyone who updates the LymeFiber website: posting an outage notice, changing a page, replacing a PDF, or updating contact details. You don't need to know any code.

**Editor address:** https://test.lymefiber.net/admin/ (after launch: https://lymefiber.net/admin/)

---

## How publishing works

- Every time you click **Save** in the editor, your change is stored on GitHub and the website is rebuilt automatically.
- **Changes appear on the live site in about 2 minutes.** Reload the page to see them. Browsers sometimes hold on to old copies; a new tab or a private window always shows the latest.
- If you save several times quickly, the site rebuilds once per save, in order. For a few minutes you may see an in-between version. Wait for the last one to finish.
- Nothing is ever lost. Every save is kept in the site's history (see [Undoing a mistake](#undoing-a-mistake)).

---

## Logging in

1. Open the editor address above.
2. Click **Sign In with GitHub**.
3. The first time, GitHub asks you to approve the **LymeFiber Site Editor**. Click **Authorize**.

You need a free GitHub account, and someone must first add you as an editor (see [Adding an editor](#adding-an-editor)).

The left sidebar lists everything you can edit: **Site Notice**, **Pages**, **Menu**, **Documents** and **Site Settings**.

---

## Posting an outage notice

The notice is a red banner at the top of every page.

**To post one:**

1. Click **Site Notice** in the sidebar, then **Outage / notice banner**.
2. Turn on **Show the banner**.
3. Choose a **Type**:
   - **Outage**: unplanned problems (red)
   - **Planned maintenance**: scheduled work (red)
   - **General notice**: anything else (green)
4. Type a short **Message**, for example:
   `Service is down in North Lyme. Crews are working on it; next update by 3 pm.`
5. Set **Posted at** to the current time. It is shown on the banner as "Posted Dec 9, 4:10 PM" (Eastern time).
6. Click **Save**.

The banner appears on every page in about 2 minutes.

**To update it:** change the message, set **Posted at** to the new time, and click **Save**.

**To remove it when the problem is fixed:** turn off **Show the banner** and click **Save**. You can leave the old message in place; it isn't shown while the banner is off.

**Tips**

- Keep it to one or two sentences.
- Links work like this: `See [our FAQ](/support/faq/)`.
- Contact details work too, for example `Call {{support_phone}}` (see [Contact-detail tokens](#contact-detail-tokens)).

---

## Editing a page

1. Click **Pages** in the sidebar. Each page is listed with its title and web address.
2. Click the page you want.
3. Edit the **Page text**. The toolbar has buttons for headings, bold, lists, links and images. If you prefer, you can type Markdown directly; for example, `## Heading` makes a heading and `**bold**` makes bold text.
4. Click **Save**.

The other fields:

- **Title**: the big heading at the top of the page, and the name in the browser tab.
- **Summary for search engines**: one or two sentences shown in Google results and link previews. On the home page, this is also the line under the big headline.
- **Web address (URL path)**: where the page lives. Don't change it on an existing page unless you mean to; old links to it will stop working.

**Images:** use the image button in the toolbar to upload a picture. Keep photos reasonably small; under 1 MB is plenty.

---

## Contact-detail tokens

Phone numbers, email addresses, the mailing address and outside links are stored once, in **Site Settings**. Pages refer to them with *tokens*: a name in double curly braces. When the site is built, each token is replaced with the current value.

| Token | Currently |
|---|---|
| `{{support_phone}}` | Support phone number |
| `{{tollfree_phone}}` | Toll-free phone number |
| `{{support_email}}` | Support email address |
| `{{transition_email}}` | Email for questions about the 2027 transition |
| `{{postal_address}}` | Mailing address |
| `{{billing_portal_url}}` | Billing portal web address |
| `{{phone_portal_url}}` | Phone portal web address |
| `{{signup_url}}` | Sign-up / order web address |
| `{{labels_base_url}}` | Start of each FCC broadband label web address |
| `{{copyright_name}}` | Name in the copyright line |

Examples in page text:

- `Call us at [{{support_phone}}](tel:{{support_phone}})` gives a clickable phone number.
- `Email [{{support_email}}](mailto:{{support_email}})` gives a clickable email address.
- `[Pay your bill]({{billing_portal_url}})` gives a link to the billing portal.

**Please use tokens rather than typing a phone number or email directly.** Then a change in Site Settings updates every page at once.

If you misspell a token, the site still publishes, but the misspelled token shows up literally on the page, curly braces and all. Fix the spelling and save again.

---

## Changing contact details (for example, after the WCVT cutover)

1. Click **Site Settings** in the sidebar, then **Contact details and links**.
2. Change the values: phone numbers, emails, mailing address, billing portal, phone portal, sign-up address.
3. Click **Save**.

Every page, the footer and the menu update automatically.

Two things are not in Site Settings and are edited directly:

- **Office hours** are on the **Contact Us** page.
- The **billing@LymeFiber.net** address is in the text of the **Exterior Connection** page.

---

## Adding a new page

1. Click **Pages**, then **New Page**.
2. Fill in **Title**, **Summary for search engines** and **Page text**.
3. Fill in **Web address (URL path)**. The rules:
   - lowercase letters, numbers and hyphens only
   - a slash at both the start and the end
   - for example `/about/history/` or `/support/wifi-tips/`

   The editor won't let you save an address that breaks these rules.
4. Click **Save**.

The page is published, but it isn't in the menu yet. To add it, see the next section.

---

## Editing the menu

1. Click **Menu**, then **Main menu**.
2. The menu has sections (Plans & Pricing, Get Connected, Phone Service, Support, About), and each section has links.
3. To add a link: open a section, click **Add** under **Links**, and fill in:
   - **Link text**: what people see in the menu
   - **Link to**: a page address like `/about/history/`, a document like `/documents/Phone-LOA.pdf`, or a full web address. Tokens such as `{{signup_url}}` work here.
   - **Opens another website**: turn this on for links to other sites (billing portal, sign-up). They get a ↗ arrow.
4. Drag links to reorder them. Use the menu on each item to remove it.
5. Click **Save**.

---

## Replacing or adding a PDF

The **Policies & Documents** page lists every PDF. It is built from the **Documents** list.

**To replace a policy with a new version:**

1. Click **Documents**, then **Policies & Documents**.
2. Open the document you're replacing.
3. Under **PDF file**, upload the new PDF. **Give the new file exactly the same file name as the old one** (for example `LymeFiber-Privacy-Policy-01_01_2022.pdf`), so that links elsewhere on the site and in old emails keep working.
4. Update **Last updated** to the new date.
5. Click **Save**.

**To add a new document:** click **Add** under **Documents**, then fill in the title, a short description, the PDF file, a category (Policies, Phone or Customer Forms) and the date.

**The FCC broadband labels file** (`broadband-facts-labels-…csv`) works the same way, but it is referred to from the **Broadband Fact Labels** page rather than from the Documents list. If you upload a new labels file with a different name, ask a technical helper to update that page's settings.

---

## Adding an editor

Editors need a free GitHub account (https://github.com/signup).

1. A repository owner goes to https://github.com/LymeFiber/lymefiber-site, then **Settings → Collaborators → Add people**.
2. Enter the new editor's GitHub username or email and send the invitation.
3. The new editor accepts the invitation from their email or from GitHub. They can then log in to the editor.

To remove an editor, go to the same **Collaborators** page and click **Remove** next to their name.

---

## Undoing a mistake

**Simplest:** open the page in the editor, put it back the way it was, and save.

**To see what a page used to say:**

1. Go to https://github.com/LymeFiber/lymefiber-site/commits/main. Every save is listed with its time and a description such as *Update Page "faq"*.
2. Click a save to see exactly what changed: removed text in red, added text in green.
3. Copy the old text back into the editor and save.

For bigger problems, a technical helper can restore any earlier version of the whole site from this history.

---

## Who to ask

- **Something on the site looks wrong after a save:** wait 2–3 minutes and reload. If it's still wrong, open the [save history](https://github.com/LymeFiber/lymefiber-site/commits/main) and click the ✓ or ✗ icon next to your save:
  - **Cloudflare Pages** ✗ means the site couldn't be rebuilt, so your change isn't live. Ask a technical helper.
  - **check** ✗ means the site was published, but the automatic check found something to tidy, such as a broken link or a misspelled token. It's not urgent; a technical helper can look at the details.
- **Accounts, hosting and the domain:** see `HANDOFF.md`.
