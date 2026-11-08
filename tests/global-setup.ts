import { execSync } from 'node:child_process';

// Build once so tests can inspect dist/ output.
export default function setup() {
  if (process.env.SKIP_BUILD) return;
  execSync('npm run build', { stdio: 'pipe' });
}
