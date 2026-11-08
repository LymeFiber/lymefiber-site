import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { parseLabelsCsv } from '../src/lib/labels-csv';

test('parses the FCC labels CSV', () => {
  const { columns, rows } = parseLabelsCsv(readFileSync('public/documents/broadband-facts-labels-2026-03-20-5-51-PM.csv', 'utf8'));
  expect(columns.slice(0, 2)).toEqual(['unique_plan_id', 'provider_name']);
  expect(rows).toHaveLength(9);
  expect(rows.every((r) => r.unique_plan_id.startsWith('F0029062494'))).toBe(true);
});

test('keeps commas inside quoted fields and handles escaped quotes', () => {
  const { rows } = parseLabelsCsv('a,b\n"x, y","say ""hi"""\n');
  expect(rows).toEqual([{ a: 'x, y', b: 'say "hi"' }]);
});

test('ignores blank lines and CRLF endings', () => {
  expect(parseLabelsCsv('a,b\r\n1,2\r\n\r\n').rows).toEqual([{ a: '1', b: '2' }]);
});
