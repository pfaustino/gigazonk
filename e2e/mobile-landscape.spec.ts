import { test, expect } from '@playwright/test';
import { gotoClean } from './helpers/navigation.js';
import { startQuickArena } from './helpers/gameFlow.js';

test.describe('mobile landscape', () => {
  test.use({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });

  test('arena shows touch controls and menu button', async ({ page }) => {
    await gotoClean(page);
    await startQuickArena(page);
    await expect(page.locator('#touch-controls')).toBeVisible();
    await expect(page.locator('#btn-mobile-pause')).toBeVisible();
    await page.locator('#btn-mobile-pause').click();
    await expect(page.locator('.menu-screen')).toBeVisible();
  });

  test('portrait phone shows rotate hint', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoClean(page);
    await expect(page.locator('#rotate-hint')).toBeVisible();
    await expect(page.locator('#rotate-hint')).toContainText(/landscape/i);
  });

  test('character select fits in landscape viewport', async ({ page }) => {
    await gotoClean(page);
    await page.locator('#btn-play').click();
    const screen = page.locator('.char-select-screen');
    await expect(screen).toBeVisible();
    const box = await screen.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y).toBeGreaterThanOrEqual(-2);
      expect(box.y + box.height).toBeLessThanOrEqual(392);
    }
    await expect(page.locator('#btn-confirm')).toBeVisible();
    await expect(page.locator('#btn-back')).toBeVisible();
  });
});
