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

/** Title → character select → Zonka Village hub. */
export async function startVillage(page: Page) {
  await page.locator('#btn-village').click();
  await expect(page.locator('.char-grid')).toBeVisible({ timeout: 15_000 });
  const confirm = page.locator('#btn-confirm');
  await expect(confirm).toBeVisible();
  await confirm.scrollIntoViewIfNeeded();
  await confirm.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.getByText('Zonka Village')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#interact-prompt')).toBeAttached();
}

/** Open dev panel, force a level-up, pick the first upgrade card. Requires Vite dev or `?dev=1`. */
export async function completeDevLevelUp(page: Page) {
  await page.locator('#dev-toggle').click();
  await page.locator('button[data-cmd="level"]').click();
  await expect(page.locator('#levelup-overlay')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Choose your Zonk upgrade')).toBeVisible();
  const card = page.locator('.upgrade-card').first();
  await expect(card).toBeVisible();
  await card.evaluate((el) => (el as HTMLElement).click());
  await expect(page.locator('#levelup-overlay')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('#hp-bar')).toBeVisible();
}

/** Title → arena → dev level-up pick (player build smoke). */
export async function startArenaAndPickLevelUp(page: Page) {
  await startQuickArena(page);
  await completeDevLevelUp(page);
}

/** Open skill tree via dev hook (requires `?dev=1`). */
export async function openSkillTreeViaDev(page: Page) {
  await page.evaluate(() => {
    window.__gigazonkGame?.ui.showSkillTree(() => undefined);
  });
  await expect(page.locator('.skill-tree')).toBeVisible({ timeout: 10_000 });
}

/** Open quest board via dev hook (requires `?dev=1`). */
export async function openQuestBoardViaDev(page: Page) {
  await page.evaluate(() => {
    const game = window.__gigazonkGame;
    if (game) game.ui.showQuestBoard(game.quests, () => undefined);
  });
  await expect(page.getByText("Elder Zonka's Quest Board")).toBeVisible({ timeout: 10_000 });
}

/** Pause arena run to village and resume (requires `?dev=1`). */
export async function pauseArenaAndResume(page: Page) {
  await page.evaluate(() => {
    window.__gigazonkGame?.leaveArenaForVillage();
  });
  await expect(page.getByText('Zonka Village')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => {
    window.__gigazonkGame?.resumeArenaRun();
  });
  await expect(page.locator('#hp-bar')).toBeVisible({ timeout: 20_000 });
}
