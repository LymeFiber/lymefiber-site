// One-off: draw the LymeFiber wordmark from Sorts Mill Goudy as outlined SVG paths.
// Run: node scripts/build-wordmark.mjs
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';

const font = opentype.parse(readFileSync('scripts/fonts/SortsMillGoudy-Regular.ttf').buffer);
const SIZE = 100;

// Extra space before each letter, as a fraction of the font size.
// Taken from the original logo's manual kerning (Inkscape dx / 45.16 font size).
const TRACK = {
  Lyme: [0, -0.066, 0, -0.044],
  Fiber: [-0.071, -0.045, -0.026, -0.032, -0.039],
};

let x = 0;
const parts = [];
for (const word of ['Lyme', 'Fiber']) {
  const path = new opentype.Path();
  [...word].forEach((ch, i) => {
    x += TRACK[word][i] * SIZE;
    const glyph = font.charToGlyph(ch);
    path.extend(glyph.getPath(x, 0, SIZE));
    x += (glyph.advanceWidth / font.unitsPerEm) * SIZE;
  });
  parts.push(path);
}

const boxes = parts.map((p) => p.getBoundingBox());
const x1 = Math.min(...boxes.map((b) => b.x1));
const y1 = Math.min(...boxes.map((b) => b.y1));
const x2 = Math.max(...boxes.map((b) => b.x2));
const y2 = Math.max(...boxes.map((b) => b.y2));
const r = (n) => +n.toFixed(2);
const viewBox = `${r(x1)} ${r(y1)} ${r(x2 - x1)} ${r(y2 - y1)}`;
const d = parts.map((p) => p.toPathData(2));

const svg = (lyme, fiber) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="LymeFiber">` +
  `<path fill="${lyme}" d="${d[0]}"/><path fill="${fiber}" d="${d[1]}"/></svg>\n`;

writeFileSync('src/assets/wordmark.svg', svg('#50792d', '#ab3d12'));
writeFileSync('src/assets/wordmark-reverse.svg', svg('#b5d394', '#f4a07e'));
console.log('viewBox', viewBox, 'ratio', ((x2 - x1) / (y2 - y1)).toFixed(3));
