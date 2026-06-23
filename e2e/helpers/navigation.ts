import type { Page } from '@playwright/test';

const READY_TIMEOUT = 60_000;

/** Fresh save before each test; waits until title screen is interactive. */
export async function gotoClean(page: Page, path = '/') {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForSelector('#btn-play', { state: 'visible', timeout: READY_TIMEOUT });
}
