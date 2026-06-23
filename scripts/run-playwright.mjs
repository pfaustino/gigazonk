/**
 * Run Playwright without NO_COLOR vs FORCE_COLOR Node warnings (Playwright sets FORCE_COLOR).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extra = process.argv.slice(2);
const cmd = extra.length
  ? `npx playwright test ${extra.map((a) => JSON.stringify(a)).join(' ')}`
  : 'npx playwright test';

const env = { ...process.env };
delete env.NO_COLOR;

const result = spawnSync(cmd, {
  cwd: root,
  env,
  shell: true,
  stdio: 'inherit',
});

if (result.status !== 0) process.exit(result.status ?? 1);
