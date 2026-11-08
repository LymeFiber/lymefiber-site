// One-off: copy the live WordPress site into migration/snapshot/.
// Run: node migration/snapshot.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SITE = 'https://www.lymefiber.net';
const OUT = new URL('./snapshot/', import.meta.url).pathname;
const UA = 'LymeFiber site migration (richb-hanover/lymefiber-site)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, as = 'text') {
  await sleep(1000);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
}

async function save(rel, data) {
  const p = join(OUT, rel);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, data);
}

const toPath = (u) => new URL(u, SITE).pathname;
const oldUrls = new Set(['/', '/feed/']);
const uploads = new Set();

const collectUploads = (html) => {
  for (const m of html.matchAll(/(?:https?:\/\/(?:www\.)?lymefiber\.net)?(\/wp-content\/uploads\/[^"'\s)?#\\]+)/gi)) {
    uploads.add(m[1]);
  }
};

// Pages
const pages = JSON.parse(await get(`${SITE}/wp-json/wp/v2/pages?per_page=100`));
for (const p of pages) {
  await save(`pages/${p.id}-${p.slug}.json`, JSON.stringify(p, null, 2));
  const html = await get(p.link);
  await save(`html/${p.slug}.html`, html);
  oldUrls.add(toPath(p.link));
  collectUploads(p.content.rendered);
}

// Posts and categories (URLs only; content is dropped)
const posts = JSON.parse(await get(`${SITE}/wp-json/wp/v2/posts?per_page=100`));
await save('posts.json', JSON.stringify(posts.map((p) => ({ id: p.id, date: p.date, link: p.link, title: p.title.rendered })), null, 2));
posts.forEach((p) => oldUrls.add(toPath(p.link)));
const cats = JSON.parse(await get(`${SITE}/wp-json/wp/v2/categories?per_page=100`));
cats.forEach((c) => oldUrls.add(toPath(c.link)));

// Sitemaps
for (const s of ['wp-sitemap-posts-post-1.xml', 'wp-sitemap-posts-page-1.xml', 'wp-sitemap-taxonomies-category-1.xml']) {
  const xml = await get(`${SITE}/${s}`);
  await save(`sitemaps/${s}`, xml);
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) oldUrls.add(toPath(m[1]));
}

// Uploaded files referenced by pages
for (const u of uploads) {
  oldUrls.add(u); // linked from the old site, so redirect it even if the file is gone
  try {
    await save(u.replace('/wp-content/uploads/', 'uploads/'), await get(SITE + u, 'buffer'));
  } catch (e) {
    console.warn('skip', e.message);
  }
}

await save('old-urls.txt', [...oldUrls].sort().join('\n') + '\n');
console.log(`pages=${pages.length} posts=${posts.length} uploads=${uploads.size} urls=${oldUrls.size}`);
