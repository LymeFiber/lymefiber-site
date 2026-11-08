// npm run check: report problems in the built site. Does not block deploys.
import { readFileSync } from 'node:fs';
import { findProblems } from './lib/check.mjs';

const oldUrls = readFileSync('migration/snapshot/old-urls.txt', 'utf8').split('\n').filter(Boolean);
const problems = findProblems('dist', oldUrls);
for (const p of problems) console.log(`- ${p}`);
console.log(`${problems.length} problem${problems.length === 1 ? '' : 's'}`);
process.exit(problems.length ? 1 : 0);
