// Runs in front of every page that _routes.json sends to Functions.
// 1. Performs the site's redirects (Cloudflare does not apply _redirects to Function requests).
// 2. Logs each redirect and 404 to the TRAFFIC_DB D1 database for the editors' traffic report.
// Logging must never change or break the visitor's response.
import { resolve } from './_lib/resolve.js';
import { logHit, pruneOld } from './_lib/hits.js';
import rulesText from './_lib/rules.generated.js';

const PRUNE_CHANCE = 0.01;

export function onRequest(context) {
  return handle(context, rulesText);
}

export async function handle(context, rules, now = Date.now(), rand = Math.random) {
  const { request } = context;
  const url = new URL(request.url);
  const loggable = request.method === 'GET' || request.method === 'HEAD';

  const target = resolve(url.pathname, rules);
  if (target !== null) {
    const location = url.search && !target.includes('?') ? target + url.search : target;
    if (loggable) record(context, { ts: now, url, status: 301, target, request }, rand);
    return new Response(null, { status: 301, headers: { Location: location } });
  }

  const response = await context.next();
  if (loggable && response.status === 404) record(context, { ts: now, url, status: 404, target: null, request }, rand);
  return response;
}

function record(context, { ts, url, status, target, request }, rand) {
  const db = context.env?.TRAFFIC_DB;
  if (!db) return;
  const hit = {
    ts,
    host: url.host,
    path: url.pathname + url.search,
    status,
    target,
    referrer: request.headers.get('Referer'),
  };
  const work = (async () => {
    try {
      await logHit(db, hit);
      if (rand() < PRUNE_CHANCE) await pruneOld(db, ts);
    } catch {
      // A logging failure must not affect the site.
    }
  })();
  context.waitUntil(work);
}
