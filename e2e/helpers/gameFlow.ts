import { expect, type Page } from '@playwright/test';
import { waitForGameReady } from './gameReady.js';
import { GAME_READY } from '../../src/lib/gameReady.js';

const ARENA_HUD_TIMEOUT = process.env.CI ? 90_000 : 20_000;

/** Title → character select → quick arena (same path as smoke play flow). */
export async function startQuickArena(page: Page) {
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('.char-grid')).toBeVisible({ timeout: 15_000 });
  const confirm = page.locator('#btn-confirm');
  await expect(confirm).toBeVisible();
  await confirm.scrollIntoViewIfNeeded();
  // DOM click avoids keyboard-nav pointer guard blocking Playwright clicks (WebKit).
  await confirm.evaluate((el) => (el as HTMLButtonElement).click());
  await waitForGameReady(page, GAME_READY.ARENA_HUD, ARENA_HUD_TIMEOUT);
  await expect(page.locator('#hp-bar')).toBeVisible();
}
