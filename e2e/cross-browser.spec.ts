import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  attachBrowserErrorCollectors,
  readReporterErrors,
  summarizeReport,
} from './helpers/browserErrors.js';
import { gotoClean } from './helpers/navigation.js';
import { startQuickArena } from './helpers/gameFlow.js';

/** Errors that degrade a feature but do not crash the game loop. */
const RECOVERABLE_REPORTER_CODES = new Set(['AUDIO_INIT', 'AUDIO_TRACK']);

test.describe('cross-browser error sweep', () => {
  test.describe.configure({ timeout: 90_000 });

  test('title and play flow stay clean', async ({ page, browserName }) => {
    const report = attachBrowserErrorCollectors(page);
    await gotoClean(page, '/?dev=1');

    await expect(page.getByRole('heading', { name: 'GigaZonk' })).toBeVisible({ timeout: 20_000 });
    await startQuickArena(page);

    const reporterErrors = await readReporterErrors(page);
    const criticalReporter = (reporterErrors as Array<{ code?: string }>).filter(
      (e) => !RECOVERABLE_REPORTER_CODES.has(e.code ?? ''),
    );
    const payload = {
      browser: browserName,
      url: page.url(),
      ...report,
      reporterErrors,
      criticalReporterErrors: criticalReporter,
    };

    const outDir = path.join('test-results', 'browser-errors');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, `${browserName}.json`),
      JSON.stringify(payload, null, 2),
    );

    expect(
      report.pageErrors,
      summarizeReport(browserName, report, criticalReporter),
    ).toEqual([]);
    expect(
      criticalReporter,
      summarizeReport(browserName, report, criticalReporter),
    ).toEqual([]);
  });
});
