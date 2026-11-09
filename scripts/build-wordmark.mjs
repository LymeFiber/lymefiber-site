// One-off: draw the LymeFiber wordmark from Sorts Mill Goudy as outlined SVG paths.
// Run: node scripts/build-wordmark.mjs
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';

const font = opentype.parse(readFileSync('scripts/fonts/SortsMillGoudy-Regular.ttf').buffer);
const SIZE = 100;

// Extra space before each letter, as a fraction of the font size.
// Taken from the original logo's manual kerning (Inkscape dx / 45.16 font size).
const TRACK = {
  Lyme: [0, -0.085, 0, -0.044],
  Fiber: [-0.025, -0.045, -0.026, -0.032, -0.039],
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

// Favicon: "LF" monogram on a cream rounded square.
const FAVICON_GAP = -0.03; // space between L and F, as a fraction of the font size
const L = font.charToGlyph('L');
const F = font.charToGlyph('F');
const lPath = L.getPath(0, 0, SIZE);
const fPath = F.getPath((L.advanceWidth / font.unitsPerEm + FAVICON_GAP) * SIZE, 0, SIZE);
const lb = lPath.getBoundingBox();
const fb = fPath.getBoundingBox();
const mx1 = Math.min(lb.x1, fb.x1);
const my1 = Math.min(lb.y1, fb.y1);
const mw = Math.max(lb.x2, fb.x2) - mx1;
const mh = Math.max(lb.y2, fb.y2) - my1;
const scale = Math.min(50 / mw, 46 / mh); // fit inside 64x64 with padding
const tx = (64 - mw * scale) / 2 - mx1 * scale;
const ty = (64 - mh * scale) / 2 - my1 * scale;
writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="12" fill="#faf7f0"/>` +
    `<g transform="translate(${r(tx)} ${r(ty)}) scale(${scale.toFixed(4)})">` +
    `<path fill="#50792d" d="${lPath.toPathData(2)}"/>` +
    `<path fill="#ab3d12" d="${fPath.toPathData(2)}"/></g></svg>\n`,
);
