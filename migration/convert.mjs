// One-off: convert snapshot WordPress pages into Markdown drafts in src/content/pages/.
// Run: node migration/convert.mjs   (then hand-edit each page)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { parse } from 'yaml';

const SNAP = 'migration/snapshot';
const OUT = 'src/content/pages';

// old slug → new file name and permalink
const MAP = {
  'home': ['home', '/'],
  'service-plans-pricing-2': ['plans', '/plans/'],
  'internet-broadband-fact-labels': ['broadband-labels', '/plans/broadband-labels/'],
  '1250-2': ['installation', '/connect/installation/'],
  'conduit-drops': ['exterior', '/connect/exterior/'],
  'voip-phone-service-2': ['phone', '/phone/'],
  'voip-phone-service': ['phone-old', '/phone-old/'], // merge into phone.md by hand, then delete
  'lymefiber-billing-portal': ['support', '/support/'],
  'faq': ['faq', '/support/faq/'],
  'system-upgrade-faq': ['system-upgrade', '/support/system-upgrade/'],
  'contact-us': ['contact', '/support/contact/'],
  'transition': ['transition', '/about/transition/'],
  'orford': ['expansion', '/about/expansion/'],
  'terms-of-service': ['terms', '/terms/'],
};

const redirects = parse(readFileSync('src/data/redirects.yaml', 'utf8')).redirects.filter((r) => !r.from.includes('*'));
const redirectTo = Object.fromEntries(redirects.map((r) => [r.from, r.to]));

const TOKENS = [
  [/https?:\/\/order\.lymefiber\.net\/broadband-facts\//gi, '{{labels_base_url}}'],
  [/https?:\/\/order\.lymefiber\.net\/?/gi, '{{signup_url}}'],
  [/https?:\/\/account\.lymefiber\.net\/?/gi, '{{billing_portal_url}}'],
  [/https?:\/\/portal\.gwi\.net\/?/gi, '{{phone_portal_url}}'],
  [/support@notices\.lymefiber\.net/gi, '{{support_email}}'],
  [/transition@lymefiber\.net/gi, '{{transition_email}}'],
  [/\(?603\)?[-. ]?795[-. ]?0915/g, '{{support_phone}}'],
  [/\(?833\)?[-. ]?795[-. ]?5300/g, '{{tollfree_phone}}'],
];

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
td.use(gfm);
td.remove(['style', 'script', 'noscript', 'iframe', 'form']);

function rewriteUrl(url) {
  let u = url.replace(/^https?:\/\/(www\.)?lymefiber\.net/i, '');
  if (u === '') u = '/';
  if (u.startsWith('/wp-content/uploads/')) {
    if (redirectTo[u]) return redirectTo[u];
    return `/images/${u.split('/').pop()}`;
  }
  if (u.startsWith('/')) return redirectTo[u] ?? u;
  return url;
}

const pages = Object.fromEntries(
  readdirSync(`${SNAP}/pages`).map((f) => {
    const p = JSON.parse(readFileSync(`${SNAP}/pages/${f}`, 'utf8'));
    return [p.slug === 'home-2' || p.id === 25 ? 'home' : p.slug, p];
  }),
);

for (const [slug, [file, permalink]] of Object.entries(MAP)) {
  const p = pages[slug];
  if (!p) { console.warn('missing', slug); continue; }
  let html = p.content.rendered
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s(class|style|id|data-[\w-]+)="[^"]*"/gi, '')
    .replace(/(href|src)="([^"]+)"/gi, (_, a, u) => `${a}="${rewriteUrl(u)}"`)
    .replace(/\ssrcset="[^"]*"|\ssizes="[^"]*"/gi, '');
  let md = td.turndown(html).replace(/\n{3,}/g, '\n\n').trim();
  for (const [re, tok] of TOKENS) md = md.replace(re, tok);
  const title = p.title.rendered.replace(/&#8211;|&mdash;/g, '–').replace(/&#038;|&amp;/g, '&').replace(/&#8217;/g, '’');
  const excerpt = (p.excerpt?.rendered ?? '').replace(/<[^>]+>/g, '').replace(/&[#\w]+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155);
  const fm = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(excerpt)}\npermalink: ${permalink}\n---\n\n`;
  writeFileSync(`${OUT}/${file}.md`, fm + md + '\n');
  console.log(`${file}.md  ${md.length} chars`);
}
