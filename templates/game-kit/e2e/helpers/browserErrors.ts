import type { Page } from '@playwright/test';

export interface ConsoleErrorLine {
  type: string;
  text: string;
  location?: string;
}

export interface BrowserErrorReport {
  console: ConsoleErrorLine[];
  pageErrors: string[];
}

export function attachBrowserErrorCollectors(page: Page): BrowserErrorReport {
  const report: BrowserErrorReport = {
    console: [],
    pageErrors: [],
  };

  page.on('console', (msg) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    report.console.push({
      type,
      text: msg.text(),
      location: msg.location()?.url,
    });
  });

  page.on('pageerror', (err) => {
    report.pageErrors.push(err.message);
  });

  return report;
}

export async function readReporterErrors(page: Page): Promise<unknown[]> {
  return page.evaluate(() => {
    const bridge = (window as Window & {
      __gameErrors?: { exportJson?: () => unknown[] };
      __gigazonkErrors?: { exportJson?: () => unknown[] };
    }).__gameErrors ?? (window as Window & {
      __gigazonkErrors?: { exportJson?: () => unknown[] };
    }).__gigazonkErrors;
    return bridge?.exportJson?.() ?? [];
  });
}

export function summarizeReport(
  browserName: string,
  report: BrowserErrorReport,
  reporterErrors: unknown[],
): string {
  const lines = [`## ${browserName}`];
  if (report.pageErrors.length) {
    lines.push('Page errors:', ...report.pageErrors.map((e) => `  - ${e}`));
  }
  if (report.console.length) {
    lines.push('Console:', ...report.console.map((c) => `  - [${c.type}] ${c.text}`));
  }
  if (reporterErrors.length) {
    lines.push('ErrorReporter:', JSON.stringify(reporterErrors, null, 2));
  }
  if (lines.length === 1) lines.push('No errors captured.');
  return lines.join('\n');
}
