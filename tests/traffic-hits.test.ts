import { describe, expect, test } from 'vitest';
import { RETENTION_MS, logHit, pruneOld, recentHits } from '../functions/_lib/hits.js';

/** A stand-in for a D1 database that records each statement and its bound values. */
function fakeDb(rows: any[] = []) {
  const calls: { sql: string; args: unknown[] }[] = [];
  return {
    calls,
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          calls.push({ sql, args });
          return { run: async () => ({}), all: async () => ({ results: rows }) };
        },
      };
    },
  };
}

const NOW = 1_000_000_000_000;

test('retention is seven days', () => {
  expect(RETENTION_MS).toBe(604800000);
});

describe('logHit', () => {
  test('inserts one row with fields in table order', async () => {
    const db = fakeDb();
    await logHit(db, { ts: NOW, host: 'lymefiber.net', path: '/faq/', status: 301, target: '/support/faq/', referrer: 'https://google.com/' });
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0].sql).toMatch(/^INSERT INTO hits/);
    expect(db.calls[0].args).toEqual([NOW, 'lymefiber.net', '/faq/', 301, '/support/faq/', 'https://google.com/']);
  });

  test('missing target and referrer are stored as null', async () => {
    const db = fakeDb();
    await logHit(db, { ts: NOW, host: 'h', path: '/x/', status: 404 });
    expect(db.calls[0].args).toEqual([NOW, 'h', '/x/', 404, null, null]);
  });

  test('very long path and referrer are cut to 500 characters', async () => {
    const db = fakeDb();
    const long = '/' + 'a'.repeat(1999);
    await logHit(db, { ts: NOW, host: 'h', path: long, status: 404, referrer: long });
    expect((db.calls[0].args[2] as string).length).toBe(500);
    expect((db.calls[0].args[5] as string).length).toBe(500);
  });
});

test('pruneOld deletes rows older than seven days', async () => {
  const db = fakeDb();
  await pruneOld(db, NOW);
  expect(db.calls[0].sql).toMatch(/DELETE FROM hits WHERE ts < \?/);
  expect(db.calls[0].args).toEqual([NOW - 604800000]);
});

test('recentHits returns the last seven days, newest first', async () => {
  const rows = [{ ts: NOW, path: '/a/' }];
  const db = fakeDb(rows);
  expect(await recentHits(db, NOW)).toEqual(rows);
  expect(db.calls[0].sql).toContain('ORDER BY ts DESC');
  expect(db.calls[0].args).toEqual([NOW - 604800000]);
});
