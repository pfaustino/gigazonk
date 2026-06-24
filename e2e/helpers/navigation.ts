import { expect, type Page } from '@playwright/test';
import { waitForGameReady } from './gameReady.js';
import { GAME_READY } from '../../src/lib/gameReady.js';

/** Fresh save before each test; waits until title screen is interactive. */
export async function gotoClean(
  page: Page,
  path = '/',
  options: { tutorial?: boolean } = {},
) {
  const withTutorial = options.tutorial ?? false;
  await page.addInitScript((enableTutorial) => {
    localStorage.clear();
    if (!enableTutorial) {
      localStorage.setItem('gigazonk_save', JSON.stringify({
        tutorialComplete: true,
        tutorialStep: 15,
      }));
    }
  }, withTutorial);
  await page.goto(path, { waitUntil: 'commit' });
  await waitForGameReady(page, GAME_READY.TITLE);
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
}
