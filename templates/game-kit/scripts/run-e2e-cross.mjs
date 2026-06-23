import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const extra = process.argv.slice(2);
const cmd = extra.length
  ? `npx playwright test ${extra.map((a) => JSON.stringify(a)).join(' ')}`
  : 'npx playwright test';

const result = spawnSync(cmd, {
  cwd: root,
  env: { ...process.env, CROSS_BROWSER: '1' },
  shell: true,
  stdio: 'inherit',
});

if (result.status !== 0) process.exit(result.status ?? 1);
