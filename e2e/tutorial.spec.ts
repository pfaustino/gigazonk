import { test, expect } from '@playwright/test';
import { gotoClean } from './helpers/navigation.js';
import {
  dismissTutorialStep,
  completeTutorialThroughArenaMove,
  reachVillageTutorialHub,
} from './helpers/tutorialFlow.js';

test.describe('Onboarding tutorial', () => {
  test('shows welcome on title then move step in arena (Play path)', async ({ page }) => {
    await gotoClean(page, '/', { tutorial: true });
    await completeTutorialThroughArenaMove(page);
    await dismissTutorialStep(page);
    await expect(page.locator('#tutorial-overlay')).toBeHidden();
  });

  test('Enter Village path shows village hub step', async ({ page }) => {
    await gotoClean(page, '/', { tutorial: true });
    await reachVillageTutorialHub(page);
    await dismissTutorialStep(page);
    await expect(page.locator('.tutorial-card h3').filter({ hasText: 'Quest Board' })).toBeVisible();
  });

  test('dev reset tutorial returns to welcome on title', async ({ page }) => {
    await gotoClean(page, '/?dev=1', { tutorial: true });
    await completeTutorialThroughArenaMove(page);
    await page.locator('#dev-toggle').click();
    await page.locator('button[data-cmd="resettutorial"]').click();
    await expect(page.getByRole('heading', { name: 'GigaZonk', exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('.tutorial-card h3').filter({ hasText: 'Welcome to GigaZonk' })).toBeVisible({
      timeout: 10_000,
    });
    const progress = await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('gigazonk_save') || '{}');
      return { step: data.tutorialStep, complete: data.tutorialComplete };
    });
    expect(progress).toEqual({ step: 0, complete: false });
  });
});
