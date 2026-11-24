// Storage for the traffic report: one row per 404 or redirect, kept for seven days.
// `db` is the D1 binding TRAFFIC_DB (schema in functions/schema.sql).

export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LEN = 500;
const MAX_QUERY = 100;

const cut = (s) => (s == null ? null : String(s).slice(0, MAX_LEN));

/** Record one hit. No IP addresses or user agents are stored. */
export async function logHit(db, { ts, host, path, status, target, referrer }) {
  await db
    .prepare('INSERT INTO hits (ts, host, path, status, target, referrer) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(ts, cut(host), cut(path), status, cut(target), cut(referrer))
    .run();
}

/** Record a site search that found nothing. */
export async function logSearch(db, { ts, host, query }) {
  await db
    .prepare('INSERT INTO searches (ts, host, query) VALUES (?, ?, ?)')
    .bind(ts, cut(host), String(query).slice(0, MAX_QUERY))
    .run();
}

/** Delete hits and searches older than the retention period. */
export async function pruneOld(db, now) {
  await db.prepare('DELETE FROM hits WHERE ts < ?').bind(now - RETENTION_MS).run();
  await db.prepare('DELETE FROM searches WHERE ts < ?').bind(now - RETENTION_MS).run();
}

/** Searches that found nothing, from the retention period, newest first. */
export async function recentSearches(db, now) {
  const { results } = await db
    .prepare('SELECT ts, host, query FROM searches WHERE ts >= ? ORDER BY ts DESC')
    .bind(now - RETENTION_MS)
    .all();
  return results;
}

/** Hits from the retention period, newest first. */
export async function recentHits(db, now) {
  const { results } = await db
    .prepare('SELECT ts, host, path, status, target, referrer FROM hits WHERE ts >= ? ORDER BY ts DESC')
    .bind(now - RETENTION_MS)
    .all();
  return results;
}
