import { expect, type Page } from '@playwright/test';

/** Title → character select → quick arena (same path as smoke play flow). */
export async function startQuickArena(page: Page) {
  await page.locator('#btn-play').click();
  await expect(page.locator('.char-grid')).toBeVisible({ timeout: 15_000 });
  const confirm = page.locator('#btn-confirm');
  await expect(confirm).toBeVisible();
  await confirm.scrollIntoViewIfNeeded();
  // DOM click avoids keyboard-nav pointer guard blocking Playwright clicks (WebKit).
  await confirm.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.locator('#hp-bar')).toBeVisible({ timeout: 20_000 });
}
