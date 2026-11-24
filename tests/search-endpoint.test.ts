import { describe, expect, test } from 'vitest';
import { handleMiss } from '../functions/api/search-miss.js';

const NOW = 1_800_000_000_000;

function fakeDb(fail = false) {
  const inserts: unknown[][] = [];
  return {
    inserts,
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        run: async () => { if (fail) throw new Error('D1 down'); if (sql.startsWith('INSERT')) inserts.push(args); return {}; },
      }),
    }),
  };
}

const post = (body: string) => new Request('https://lymefiber.net/api/search-miss', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } });

describe('POST /api/search-miss', () => {
  test('stores a search that found nothing', async () => {
    const db = fakeDb();
    const res = await handleMiss({ request: post('{"q":"fiber in orford"}'), env: { TRAFFIC_DB: db } } as any, NOW);
    expect(res.status).toBe(204);
    expect(db.inserts).toEqual([[NOW, 'lymefiber.net', 'fiber in orford']]);
  });

  test.each([
    ['too short', '{"q":"ab"}'],
    ['only spaces', '{"q":"     "}'],
    ['not text', '{"q":42}'],
    ['not JSON', 'q=hello'],
    ['too big', JSON.stringify({ q: 'a'.repeat(2000) })],
  ])('rejects a request that is %s, without touching the database', async (_label, body) => {
    const db = fakeDb();
    const res = await handleMiss({ request: post(body), env: { TRAFFIC_DB: db } } as any, NOW);
    expect(res.status).toBe(400);
    expect(db.inserts).toEqual([]);
  });

  test('no database: still answers 204', async () => {
    const res = await handleMiss({ request: post('{"q":"starlink"}'), env: {} } as any, NOW);
    expect(res.status).toBe(204);
  });

  test('database error: still answers 204', async () => {
    const res = await handleMiss({ request: post('{"q":"starlink"}'), env: { TRAFFIC_DB: fakeDb(true) } } as any, NOW);
    expect(res.status).toBe(204);
  });
});
