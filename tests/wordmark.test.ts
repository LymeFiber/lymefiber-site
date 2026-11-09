import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// Letter bounding box of the original "LymeFiber Logo.png" (652 x 156 px of glyphs).
const ORIGINAL_RATIO = 652 / 156;

describe.each(['src/assets/wordmark.svg', 'src/assets/wordmark-reverse.svg'])('%s', (file) => {
  const svg = readFileSync(file, 'utf8');

  test('is outlined, clean and labelled', () => {
    expect(svg).not.toContain('<text');
    expect(svg).not.toMatch(/sodipodi|inkscape/);
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="LymeFiber"');
    expect(svg.match(/<path/g)?.length).toBe(2);
  });

  // Sorts Mill Goudy letters are wider than Goudy Old Style, and the owner set the
  // letter spacing by eye, so allow 10%.
  test('matches the original proportions within 10%', () => {
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)![1].split(/\s+/).map(Number);
    expect(Math.abs(w / h - ORIGINAL_RATIO) / ORIGINAL_RATIO).toBeLessThan(0.10);
  });
});

test('favicon shows a green L and a red F', () => {
  const svg = readFileSync('public/favicon.svg', 'utf8');
  expect(svg).not.toContain('<text');
  expect(svg.match(/<path/g)?.length).toBe(2);
  expect(svg).toMatch(/<path fill="#50792d"[^>]*>\s*<path fill="#ab3d12"/);
});

test('main wordmark uses the brand colors', () => {
  const svg = readFileSync('src/assets/wordmark.svg', 'utf8');
  expect(svg).toContain('fill="#50792d"');
  expect(svg).toContain('fill="#ab3d12"');
});
