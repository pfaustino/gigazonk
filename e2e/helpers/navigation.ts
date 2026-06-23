import type { Page } from '@playwright/test';

/** Fresh save before each test; waits until title screen is interactive. */
export async function gotoClean(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('#game-canvas', { state: 'visible', timeout: 30_000 });
  await page.waitForSelector('#btn-play', { state: 'visible', timeout: 30_000 });
}
