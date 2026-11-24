import { describe, expect, test } from 'vitest';
import { handle } from '../functions/_middleware.js';

const RULES = '/faq/ /support/faq/ 301\n/faq /support/faq/ 301\n/wp-content/uploads/* /documents/ 301\n/go/ https://order.lymefiber.net/?a=1 301\n';
const NOW = 1_800_000_000_000;

/** A D1 stand-in recording inserts and deletes. `fail` makes every statement reject. */
function fakeDb(fail = false) {
  const hits: unknown[][] = [];
  const deletes: unknown[][] = [];
  return {
    hits,
    deletes,
    prepare(sql: string) {
      return {
        bind: (...args: unknown[]) => ({
          run: async () => {
            if (fail) throw new Error('D1 down');
            (sql.startsWith('INSERT') ? hits : deletes).push(args);
            return {};
          },
        }),
      };
    },
  };
}

function ctx(url: string, opts: { method?: string; status?: number; referer?: string; db?: any; noDb?: boolean } = {}) {
  const waited: Promise<unknown>[] = [];
  let nextCalls = 0;
  const db = opts.db ?? fakeDb();
  const headers: Record<string, string> = opts.referer ? { Referer: opts.referer } : {};
  return {
    db,
    waited,
    get nextCalls() { return nextCalls; },
    context: {
      request: new Request(url, { method: opts.method ?? 'GET', headers }),
      env: opts.noDb ? {} : { TRAFFIC_DB: db },
      next: async () => { nextCalls++; return new Response('page', { status: opts.status ?? 200 }); },
      waitUntil: (p: Promise<unknown>) => { waited.push(p); },
    },
  };
}

async function run(c: ReturnType<typeof ctx>, rand = () => 0.5) {
  const res = await handle(c.context, RULES, NOW, rand);
  await Promise.all(c.waited);
  return res;
}

describe('redirects', () => {
  test('known old address redirects with 301 and is logged', async () => {
    const c = ctx('https://lymefiber.net/faq/');
    const res = await run(c);
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/support/faq/');
    expect(c.nextCalls).toBe(0);
    expect(c.db.hits).toEqual([[NOW, 'lymefiber.net', '/faq/', 301, '/support/faq/', null]]);
  });

  test('query string is kept on the target and in the log', async () => {
    const c = ctx('https://lymefiber.net/faq/?utm_source=x');
    const res = await run(c);
    expect(res.headers.get('Location')).toBe('/support/faq/?utm_source=x');
    expect(c.db.hits[0][2]).toBe('/faq/?utm_source=x');
  });

  test('a target that already has a query string is left alone', async () => {
    const c = ctx('https://lymefiber.net/go/?b=2');
    const res = await run(c);
    expect(res.headers.get('Location')).toBe('https://order.lymefiber.net/?a=1');
  });

  test('wildcard rules match', async () => {
    const res = await run(ctx('https://lymefiber.net/wp-content/uploads/2021/08/x.pdf'));
    expect(res.headers.get('Location')).toBe('/documents/');
  });
});

describe('pages and 404s', () => {
  test('a normal page passes through and is not logged', async () => {
    const c = ctx('https://lymefiber.net/plans/');
    const res = await run(c);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('page');
    expect(c.db.hits).toEqual([]);
  });

  test('a 404 passes through and is logged with its referrer', async () => {
    const c = ctx('https://test.lymefiber.net/nope/', { status: 404, referer: 'https://google.com/' });
    const res = await run(c);
    expect(res.status).toBe(404);
    expect(c.db.hits).toEqual([[NOW, 'test.lymefiber.net', '/nope/', 404, null, 'https://google.com/']]);
  });

  test('POST requests are not logged', async () => {
    const c = ctx('https://lymefiber.net/nope/', { method: 'POST', status: 404 });
    await run(c);
    expect(c.db.hits).toEqual([]);
  });

  test('HEAD requests are logged', async () => {
    const c = ctx('https://lymefiber.net/nope/', { method: 'HEAD', status: 404 });
    await run(c);
    expect(c.db.hits).toHaveLength(1);
  });
});

describe('logging never breaks the site', () => {
  test('no database binding: redirects still work', async () => {
    const c = ctx('https://lymefiber.net/faq/', { noDb: true });
    const res = await run(c);
    expect(res.status).toBe(301);
  });

  test('database errors are swallowed', async () => {
    const c = ctx('https://lymefiber.net/nope/', { status: 404, db: fakeDb(true) });
    const res = await handle(c.context, RULES, NOW, () => 0.001);
    expect(res.status).toBe(404);
    await expect(Promise.all(c.waited)).resolves.toBeDefined();
  });
});

describe('pruning', () => {
  test('about one request in a hundred prunes old rows', async () => {
    const c = ctx('https://lymefiber.net/nope/', { status: 404 });
    await run(c, () => 0.001);
    expect(c.db.deletes).toEqual([[NOW - 604800000]]);
  });

  test('other requests do not prune', async () => {
    const c = ctx('https://lymefiber.net/nope/', { status: 404 });
    await run(c, () => 0.5);
    expect(c.db.deletes).toEqual([]);
  });
});
