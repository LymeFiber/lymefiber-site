// POST /api/search-miss — the site search reports a search that found nothing.
// Public (visitors' browsers call it), so it accepts only a small JSON body: {"q": "<search text>"}.
// It never fails the visitor: storage problems still answer 204.
import { logSearch } from '../_lib/hits.js';

const MAX_BODY = 1000;
const MIN_LENGTH = 3;

const empty = (status) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

export function onRequestPost(context) {
  return handleMiss(context);
}

export async function handleMiss(context, now = Date.now()) {
  let q;
  try {
    const text = await context.request.text();
    if (text.length > MAX_BODY) return empty(400);
    q = JSON.parse(text)?.q;
  } catch {
    return empty(400);
  }
  if (typeof q !== 'string') return empty(400);
  q = q.trim().replace(/\s+/g, ' ');
  if (q.length < MIN_LENGTH) return empty(400);

  const db = context.env?.TRAFFIC_DB;
  if (db) {
    try {
      await logSearch(db, { ts: now, host: new URL(context.request.url).host, query: q });
    } catch {
      // Logging must never affect the visitor.
    }
  }
  return empty(204);
}
