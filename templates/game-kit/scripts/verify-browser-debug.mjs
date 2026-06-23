/**
 * End-to-end browser debug verification (no MCP required).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const summaryPath = path.join(root, 'test-results', 'browser-errors', 'browser-errors-summary.json');

console.log('Running cross-browser error sweep...');
const run = spawnSync('node scripts/collect-browser-errors.mjs', {
  cwd: root,
  shell: true,
  stdio: 'inherit',
});

if (!fs.existsSync(summaryPath)) {
  console.error('Missing summary — collect-browser-errors did not produce JSON.');
  process.exit(1);
}

const { reports } = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
let critical = 0;
for (const r of reports) {
  critical += (r.pageErrors?.length ?? 0) + (r.criticalReporterErrors?.length ?? 0);
}

console.log('\n--- verify-browser-debug ---');
console.log(`Browsers scanned: ${reports.map((r) => r.browser).join(', ')}`);
console.log(`Critical errors: ${critical}`);
console.log(`Summary: ${summaryPath}`);

if (critical > 0) {
  console.error('Critical browser errors found — inspect JSON before ship.');
  process.exit(1);
}

console.log('OK — no critical cross-browser errors.');

if (run.status !== 0) process.exit(run.status ?? 1);
