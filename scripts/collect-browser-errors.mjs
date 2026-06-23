/**
 * Run cross-browser Playwright sweep and print a merged error report.
 * Usage: npm run collect-browser-errors
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outRoot = path.join(root, 'test-results', 'browser-errors');

const run = spawnSync(
  'npx playwright test e2e/cross-browser.spec.ts',
  {
    cwd: root,
    env: { ...process.env, CROSS_BROWSER: '1' },
    shell: true,
    encoding: 'utf8',
  },
);

const reports = [];
for (const browser of ['chromium', 'firefox', 'webkit']) {
  const file = path.join(outRoot, `${browser}.json`);
  if (fs.existsSync(file)) {
    reports.push(JSON.parse(fs.readFileSync(file, 'utf8')));
  }
}

const summaryPath = path.join(outRoot, 'browser-errors-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify({ generatedAt: Date.now(), reports }, null, 2));

console.log('\n--- Browser error summary ---');
for (const r of reports) {
  const pageErr = r.pageErrors?.length ?? 0;
  const consoleErr = r.console?.length ?? 0;
  const reporterErr = r.reporterErrors?.length ?? 0;
  const criticalErr = r.criticalReporterErrors?.length ?? 0;
  console.log(
    `${r.browser}: page=${pageErr} console=${consoleErr} reporter=${reporterErr} critical=${criticalErr}`,
  );
}
console.log(`Full JSON: ${summaryPath}`);

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}
