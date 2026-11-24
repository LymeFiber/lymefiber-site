import { beforeEach, describe, expect, test } from 'vitest';
import { summarize, isEditor, _clearEditorCache } from '../functions/_lib/report.js';
import { onRequestGet, handleReport } from '../functions/api/traffic.js';

const t = (iso: string) => Date.parse(iso);
const hit = (o: Partial<{ ts: number; host: string; path: string; status: number; target: string | null; referrer: string | null }>) => ({
  ts: t('2026-11-24T15:00:00Z'), host: 'lymefiber.net', path: '/a/', status: 404, target: null, referrer: null, ...o,
});

describe('summarize', () => {
  test('groups 404s by address with counts, first/last seen and top referrers', () => {
    const s = summarize([
      hit({ ts: t('2026-11-24T15:00:00Z'), referrer: 'https://google.com/' }),
      hit({ ts: t('2026-11-23T15:00:00Z'), referrer: 'https://google.com/' }),
      hit({ ts: t('2026-11-22T15:00:00Z'), referrer: null }),
    ]);
    expect(s.notFound).toEqual([{
      path: '/a/', count: 3, firstSeen: t('2026-11-22T15:00:00Z'), lastSeen: t('2026-11-24T15:00:00Z'),
      referrers: [{ referrer: 'https://google.com/', count: 2 }],
    }]);
  });

  test('keeps only the top three referrers', () => {
    const refs = ['a', 'a', 'a', 'a', 'b', 'b', 'b', 'c', 'c', 'd'].map((r) => hit({ referrer: `https://${r}/` }));
    expect(summarize(refs).notFound[0].referrers.map((r: any) => r.referrer)).toEqual(['https://a/', 'https://b/', 'https://c/']);
  });

  test('groups redirects by old address with their target', () => {
    const s = summarize([
      hit({ path: '/faq/', status: 301, target: '/support/faq/', ts: t('2026-11-24T10:00:00Z') }),
      hit({ path: '/faq/', status: 301, target: '/support/faq/', ts: t('2026-11-24T12:00:00Z') }),
    ]);
    expect(s.redirects).toEqual([{ path: '/faq/', target: '/support/faq/', count: 2, lastSeen: t('2026-11-24T12:00:00Z') }]);
    expect(s.notFound).toEqual([]);
  });

  test('sorts by count, then address', () => {
    const s = summarize([hit({ path: '/b/' }), hit({ path: '/c/' }), hit({ path: '/c/' }), hit({ path: '/a/' })]);
    expect(s.notFound.map((r: any) => r.path)).toEqual(['/c/', '/a/', '/b/']);
  });

  test('daily totals use Eastern time, oldest first', () => {
    const s = summarize([
      hit({ ts: t('2026-11-24T03:00:00Z') }), // 10 PM on Nov 23 in New York
      hit({ ts: t('2026-11-24T15:00:00Z'), status: 301, target: '/x/' }),
    ]);
    expect(s.days).toEqual([
      { day: '2026-11-23', notFound: 1, redirects: 0 },
      { day: '2026-11-24', notFound: 0, redirects: 1 },
    ]);
  });
});

describe('isEditor', () => {
  beforeEach(() => _clearEditorCache());
  const gh = (status: number, body: unknown) => {
    const calls: { url: string; init: any }[] = [];
    const fn = async (url: string, init: any) => { calls.push({ url, init }); return new Response(JSON.stringify(body), { status }); };
    return Object.assign(fn, { calls });
  };

  test('true when the token can push to the site repo', async () => {
    const f = gh(200, { permissions: { push: true } });
    expect(await isEditor('tok', f)).toBe(true);
    expect(f.calls[0].url).toBe('https://api.github.com/repos/LymeFiber/lymefiber-site');
    expect(f.calls[0].init.headers.Authorization).toBe('Bearer tok');
    expect(f.calls[0].init.headers['User-Agent']).toBe('lymefiber-traffic-report');
  });
  test('false when the token cannot push', async () => {
    expect(await isEditor('tok', gh(200, { permissions: { push: false } }))).toBe(false);
  });
  test('false when GitHub rejects the token', async () => {
    expect(await isEditor('tok', gh(401, { message: 'Bad credentials' }))).toBe(false);
  });
  test('remembers the answer for the same token', async () => {
    const f = gh(200, { permissions: { push: true } });
    await isEditor('tok', f);
    await isEditor('tok', f);
    expect(f.calls).toHaveLength(1);
  });
});

describe('GET /api/traffic', () => {
  const req = (auth?: string) => new Request('https://lymefiber.net/api/traffic', { headers: auth ? { Authorization: auth } : {} });

  test('without a token: 401 signin, not cached', async () => {
    const res = await onRequestGet({ request: req(), env: {} } as any);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'signin' });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  const NOW = t('2026-11-24T20:00:00Z');
  const ghFetch = (push: boolean) => async () => new Response(JSON.stringify({ permissions: { push } }), { status: 200 });
  const db = (rows: any[]) => {
    const sql: string[] = [];
    return {
      sql,
      prepare: (q: string) => ({ bind: () => ({ run: async () => { sql.push(q); return {}; }, all: async () => { sql.push(q); return { results: rows }; } }) }),
    };
  };
  beforeEach(() => _clearEditorCache());

  test('token that cannot edit the site: 403', async () => {
    const res = await handleReport({ request: req('Bearer a'), env: { TRAFFIC_DB: db([]) } } as any, NOW, ghFetch(false));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  test('database not set up: 503', async () => {
    const res = await handleReport({ request: req('Bearer b'), env: {} } as any, NOW, ghFetch(true));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'nodb' });
  });

  test('editor gets the summary and the list of hosts; old rows are pruned first', async () => {
    const d = db([hit({ host: 'test.lymefiber.net' }), hit({ host: 'lymefiber.net', path: '/faq/', status: 301, target: '/support/faq/' })]);
    const res = await handleReport({ request: req('Bearer c'), env: { TRAFFIC_DB: d } } as any, NOW, ghFetch(true));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.generatedAt).toBe(NOW);
    expect(body.hosts).toEqual(['lymefiber.net', 'test.lymefiber.net']);
    expect(body.notFound).toHaveLength(1);
    expect(body.redirects).toHaveLength(1);
    expect(body.days).toHaveLength(1);
    expect(d.sql[0]).toMatch(/^DELETE/);
  });
});
