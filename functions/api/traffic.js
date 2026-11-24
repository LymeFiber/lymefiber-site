// GET /api/traffic — the last seven days of 404s and redirects, for signed-in site editors only.
import { isEditor, summarize, summarizeSearches } from '../_lib/report.js';
import { pruneOld, recentHits, recentSearches } from '../_lib/hits.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export function onRequestGet(context) {
  return handleReport(context);
}

export async function handleReport(context, now = Date.now(), fetchFn = fetch) {
  const token = (context.request.headers.get('Authorization') ?? '').match(/^Bearer\s+(\S+)$/)?.[1];
  if (!token) return json(401, { error: 'signin' });
  if (!(await isEditor(token, fetchFn, now))) return json(403, { error: 'forbidden' });

  const db = context.env?.TRAFFIC_DB;
  if (!db) return json(503, { error: 'nodb' });

  await pruneOld(db, now);
  const hits = await recentHits(db, now);
  const searches = await recentSearches(db, now);
  const hosts = [...new Set([...hits, ...searches].map((h) => h.host))].sort();
  const host = new URL(context.request.url).searchParams.get('host');
  const onHost = (r) => !host || r.host === host;
  return json(200, {
    generatedAt: now,
    hosts,
    host: host ?? '',
    ...summarize(hits.filter(onHost)),
    searches: summarizeSearches(searches.filter(onHost)),
  });
}
