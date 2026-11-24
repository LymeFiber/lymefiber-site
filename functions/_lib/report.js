// Summaries and access checks for the editors' traffic report (functions/api/traffic.js).

const REPO_API = 'https://api.github.com/repos/LymeFiber/lymefiber-site';
const CACHE_MS = 5 * 60 * 1000;
const TOP_REFERRERS = 3;

const easternDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });

const byCountThenPath = (a, b) => b.count - a.count || a.path.localeCompare(b.path);

/** Group raw hits into the report's tables. */
export function summarize(hits) {
  const notFound = new Map();
  const redirects = new Map();
  const days = new Map();

  for (const h of hits) {
    const day = easternDay.format(h.ts);
    const d = days.get(day) ?? { day, notFound: 0, redirects: 0 };
    days.set(day, d);

    if (h.status === 404) {
      d.notFound++;
      const r = notFound.get(h.path) ?? { path: h.path, count: 0, firstSeen: h.ts, lastSeen: h.ts, refs: new Map() };
      r.count++;
      r.firstSeen = Math.min(r.firstSeen, h.ts);
      r.lastSeen = Math.max(r.lastSeen, h.ts);
      if (h.referrer) r.refs.set(h.referrer, (r.refs.get(h.referrer) ?? 0) + 1);
      notFound.set(h.path, r);
    } else {
      d.redirects++;
      const r = redirects.get(h.path) ?? { path: h.path, target: h.target, count: 0, lastSeen: h.ts };
      r.count++;
      r.lastSeen = Math.max(r.lastSeen, h.ts);
      redirects.set(h.path, r);
    }
  }

  return {
    notFound: [...notFound.values()]
      .map(({ refs, ...r }) => ({
        ...r,
        referrers: [...refs]
          .map(([referrer, count]) => ({ referrer, count }))
          .sort((a, b) => b.count - a.count || a.referrer.localeCompare(b.referrer))
          .slice(0, TOP_REFERRERS),
      }))
      .sort(byCountThenPath),
    redirects: [...redirects.values()].sort(byCountThenPath),
    days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
}

/** Group searches that found nothing by their text (ignoring case), most frequent first. */
export function summarizeSearches(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = r.query.toLowerCase();
    const g = groups.get(key) ?? { query: key, count: 0, lastSeen: r.ts };
    g.count++;
    g.lastSeen = Math.max(g.lastSeen, r.ts);
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.query.localeCompare(b.query));
}

const editorCache = new Map(); // token → { ok, until }

/** True if the GitHub token belongs to someone who can push to the site repo (i.e. edit the site). */
export async function isEditor(token, fetchFn = fetch, now = Date.now()) {
  const cached = editorCache.get(token);
  if (cached && cached.until > now) return cached.ok;
  let ok;
  try {
    const res = await fetchFn(REPO_API, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'lymefiber-traffic-report' },
    });
    if (res.ok) ok = (await res.json())?.permissions?.push === true;
    else if ([401, 403, 404].includes(res.status)) ok = false;
    else return false; // GitHub trouble: deny this time, but don't remember it
  } catch {
    return false; // network trouble: same
  }
  for (const [t, v] of editorCache) if (v.until <= now) editorCache.delete(t);
  editorCache.set(token, { ok, until: now + CACHE_MS });
  return ok;
}

/** For tests. */
export function _clearEditorCache() {
  editorCache.clear();
}
