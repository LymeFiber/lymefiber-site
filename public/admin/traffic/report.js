// Traffic report page: shows the last seven days of 404s and redirects from /api/traffic.
// Only signed-in site editors can load the data; we reuse the GitHub sign-in Sveltia CMS saved.

export const REDIRECTS_EDITOR_URL = '/admin/#/collections/redirects/entries/redirects';

/** Addresses that are almost always automated scanners, not people. Edit freely. */
export const BOT_PATTERNS = [
  /wp-login/i, /wp-admin/i, /xmlrpc/i, /wlwmanifest/i, /\.php/i, /\.env/i, /\.git/i,
  /phpmyadmin/i, /cgi-bin/i, /\.aspx?($|[?/])/i,
];

export const isBotProbe = (path) => BOT_PATTERNS.some((re) => re.test(path));

/** The GitHub token Sveltia CMS keeps in localStorage after sign-in, or null. */
export function readToken(storage) {
  try {
    const token = JSON.parse(storage.getItem('sveltia-cms.user') ?? 'null')?.token;
    return typeof token === 'string' && token ? token : null;
  } catch {
    return null;
  }
}

const when = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dayLabel = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  e.append(...children.flat().filter((c) => c != null));
  return e;
}

const shortRef = (r) => {
  try {
    const u = new URL(r);
    return u.host + (u.pathname === '/' ? '' : u.pathname);
  } catch {
    return r;
  }
};

/** Start the page. Called from index.html. */
export async function start() {
  const main = document.getElementById('report');
  const status = document.getElementById('status');
  const token = readToken(localStorage);
  const signIn = () => {
    status.replaceChildren('Sign in to the editor first, then come back to this page. ', el('a', { href: '/admin/' }, 'Open the editor'));
    main.replaceChildren();
  };
  if (!token) return signIn();

  const state = { hideBots: true, host: '' };
  let data = null;
  const render = () => main.replaceChildren(...view(data, state, render, load));

  async function load() {
    status.textContent = 'Loading…';
    try {
      const query = state.host ? `?host=${encodeURIComponent(state.host)}` : '';
      const res = await fetch(`/api/traffic${query}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (res.status === 401 || res.status === 403) return signIn();
      if (res.status === 503) {
        status.textContent = "The traffic log isn't set up yet (see HANDOFF.md).";
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      status.textContent = `Couldn't load the report (${err.message}). Try Refresh.`;
      return;
    }
    status.textContent = `Updated ${when.format(data.generatedAt)}`;
    render();
  }

  document.getElementById('refresh').addEventListener('click', load);
  await load();
}

function view(data, state, render, load) {
  const notFound = data.notFound.filter((r) => !(state.hideBots && isBotProbe(r.path)));
  const hiddenBots = data.notFound.length - notFound.length;

  const controls = el('p', { class: 'controls' },
    el('label', {},
      Object.assign(el('input', { type: 'checkbox', onchange: (e) => { state.hideBots = e.target.checked; render(); } }), { checked: state.hideBots }),
      ' Hide bot probes', hiddenBots ? ` (${hiddenBots} hidden)` : ''),
  );

  const days = data.days.length
    ? el('p', { class: 'days' }, 'Per day (404s / redirects): ',
        data.days.map((d, i) => [i ? ' · ' : '', `${dayLabel(d.day)}: ${d.notFound} / ${d.redirects}`]))
    : null;

  const nfTable = notFound.length
    ? el('table', {},
        el('thead', {}, el('tr', {}, el('th', { class: 'n' }, 'Count'), el('th', {}, 'Address'), el('th', {}, 'Last seen'), el('th', {}, 'Linked from'), el('th', {}, ''))),
        el('tbody', {}, notFound.map((r) => el('tr', {},
          el('td', { class: 'n' }, String(r.count)),
          el('td', { class: 'path' }, r.path),
          el('td', {}, when.format(r.lastSeen)),
          el('td', {}, r.referrers.length ? r.referrers.map((x, i) => [i ? ', ' : '', `${shortRef(x.referrer)} (${x.count})`]) : '—'),
          el('td', {}, el('button', { type: 'button', title: 'Copies the address and opens the Redirects list in the editor', onclick: () => addRedirect(r.path) }, 'Add redirect…')),
        ))))
    : el('p', { class: 'empty' }, 'No missing pages in the last seven days.');

  const rdTable = data.redirects.length
    ? el('table', {},
        el('thead', {}, el('tr', {}, el('th', { class: 'n' }, 'Count'), el('th', {}, 'Old address'), el('th', {}, 'Went to'), el('th', {}, 'Last seen'))),
        el('tbody', {}, data.redirects.map((r) => el('tr', {},
          el('td', { class: 'n' }, String(r.count)),
          el('td', { class: 'path' }, r.path),
          el('td', { class: 'path' }, r.target ?? ''),
          el('td', {}, when.format(r.lastSeen)),
        ))))
    : el('p', { class: 'empty' }, 'No redirects used in the last seven days.');

  let hosts = null;
  if (data.hosts.length > 1) {
    const select = el('select', { onchange: () => { state.host = select.value; load(); } },
      el('option', { value: '' }, 'All'), data.hosts.map((h) => el('option', { value: h }, h)));
    select.value = state.host;
    hosts = el('p', { class: 'controls' }, el('label', {}, 'Site address: ', select));
  }

  return [
    days, hosts,
    el('h2', {}, 'Not found (404)'), controls, nfTable,
    el('h2', {}, 'Redirects used'), rdTable,
  ].filter(Boolean);
}

async function addRedirect(path) {
  try {
    await navigator.clipboard.writeText(path.split('?')[0]);
  } catch {
    // Clipboard may be unavailable; the editor still opens.
  }
  window.open(REDIRECTS_EDITOR_URL, '_blank');
}
