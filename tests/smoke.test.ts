import { existsSync } from 'node:fs';
import { expect, test } from 'vitest';

test('build produces the home page', () => {
  expect(existsSync('dist/index.html')).toBe(true);
});
