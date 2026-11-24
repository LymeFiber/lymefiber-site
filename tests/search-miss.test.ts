import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MissLogger, normalizeQuery } from '../src/lib/search-miss';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function logger() {
  const sent: string[] = [];
  return { sent, log: new MissLogger((q) => sent.push(q), 2000) };
}

describe('normalizeQuery', () => {
  test('trims, collapses spaces and keeps at most 100 characters', () => {
    expect(normalizeQuery('  fiber   in  orford ')).toBe('fiber in orford');
    expect(normalizeQuery('x'.repeat(150))).toHaveLength(100);
  });
});

describe('MissLogger', () => {
  test('logs a search with no results after a 2-second pause', () => {
    const { sent, log } = logger();
    log.update('starlink', 0);
    vi.advanceTimersByTime(1999);
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(sent).toEqual(['starlink']);
  });

  test('does not log a search that found something', () => {
    const { sent, log } = logger();
    log.update('conduit', 3);
    vi.advanceTimersByTime(5000);
    log.flush();
    expect(sent).toEqual([]);
  });

  test('ignores searches shorter than 3 characters, or only spaces', () => {
    const { sent, log } = logger();
    log.update('  ab ', 0);
    log.update('    ', 0);
    vi.advanceTimersByTime(5000);
    log.flush();
    expect(sent).toEqual([]);
  });

  test('Enter or closing the panel logs straight away', () => {
    const { sent, log } = logger();
    log.update('cable tv', 0);
    log.flush();
    expect(sent).toEqual(['cable tv']);
    vi.advanceTimersByTime(5000);
    expect(sent).toEqual(['cable tv']);
  });

  test('the same search is logged only once, whatever the case', () => {
    const { sent, log } = logger();
    log.update('Cable TV', 0);
    vi.advanceTimersByTime(2000);
    log.update('cable tv', 0);
    vi.advanceTimersByTime(2000);
    log.update('cable t', 0);
    log.update('cable tv ', 0);
    log.flush();
    expect(sent).toEqual(['Cable TV']);
  });

  test('typing on to a search that finds results cancels the pending one', () => {
    const { sent, log } = logger();
    log.update('condu', 0);
    vi.advanceTimersByTime(1000);
    log.update('conduit', 2);
    vi.advanceTimersByTime(5000);
    log.flush();
    expect(sent).toEqual([]);
  });

  test('long searches are sent cut to 100 characters', () => {
    const { sent, log } = logger();
    log.update('y'.repeat(150), 0);
    log.flush();
    expect(sent[0]).toHaveLength(100);
  });
});
