import { expect, type Page } from '@playwright/test';

/** Character select Continue → Run Contract → Enter Arena. */
export async function completeRunContract(page: Page) {
  await expect(page.locator('.run-modifier-screen')).toBeVisible({ timeout: 15_000 });
  await page.locator('#boon-grid .modifier-card').first().evaluate((el) => (el as HTMLElement).click());
  await page.locator('#curse-grid .modifier-card').first().evaluate((el) => (el as HTMLElement).click());
  const enter = page.locator('#btn-modifier-enter');
  await expect(enter).toBeEnabled();
  await enter.evaluate((el) => (el as HTMLButtonElement).click());
}
