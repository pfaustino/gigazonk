import type { Page } from '@playwright/test';

/** Fresh save before each test. */
export async function gotoClean(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#game-canvas', { state: 'visible', timeout: 30_000 });
}
