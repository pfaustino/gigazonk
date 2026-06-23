import { test, expect } from '@playwright/test';

/** Fresh save before each test. */
async function gotoClean(page: import('@playwright/test').Page, path = '/') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#game-canvas');
}

test.describe('GigaZonk smoke', () => {
  test('title screen loads', async ({ page }) => {
    await gotoClean(page);
    await expect(page.getByRole('heading', { name: 'GigaZonk' })).toBeVisible();
    await expect(page.locator('#btn-play')).toBeVisible();
    await expect(page.locator('#game-canvas')).toBeVisible();
  });

  test('play flow reaches arena HUD', async ({ page }) => {
    await gotoClean(page);
    await page.locator('#btn-play').click();
    await page.locator('#btn-confirm').click();
    await expect(page.locator('#hp-bar')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#time-stat')).toBeVisible();
    await expect(page.locator('#enemy-stat')).toContainText('Enemies');
  });

  test('dev flag shows dev panel', async ({ page }) => {
    await gotoClean(page, '/?dev=1');
    await expect(page.locator('#dev-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#dev-toggle')).toBeVisible();
  });

  test('seeded run URL loads without error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await gotoClean(page, '/?seed=42&dev=1');
    await expect(page.getByRole('heading', { name: 'GigaZonk' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
