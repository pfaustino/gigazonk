import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  attachBrowserErrorCollectors,
  readReporterErrors,
  summarizeReport,
} from './helpers/browserErrors.js';

const RECOVERABLE_REPORTER_CODES = new Set(['AUDIO_INIT', 'AUDIO_TRACK']);

test.describe('cross-browser error sweep', () => {
  test('index and dev panel load without critical errors', async ({ page, browserName }) => {
    const report = attachBrowserErrorCollectors(page);
    await page.goto('/?dev=1');
    await expect(page.locator('#dev-panel')).toBeVisible({ timeout: 15_000 });

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
