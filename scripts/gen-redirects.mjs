// Post-build: write dist/_redirects from src/data/redirects.yaml and settings.
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { renderRedirects } from './lib/redirects.mjs';

const rules = parse(readFileSync('src/data/redirects.yaml', 'utf8')).redirects ?? [];
const settings = parse(readFileSync('src/data/settings.yaml', 'utf8'));
writeFileSync('dist/_redirects', renderRedirects(rules, settings));
console.log(`_redirects: ${rules.length} rules`);
