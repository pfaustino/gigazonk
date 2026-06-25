import { expect, type Page } from '@playwright/test';

/** Dismiss one tutorial overlay click (next step may appear immediately). */
export async function dismissTutorialStep(page: Page) {
  const overlay = page.locator('#tutorial-overlay');
  if (await overlay.isVisible().catch(() => false)) {
    await page.locator('#tutorial-ok').click();
    await page.waitForTimeout(150);
  }
}

/** Click through consecutive tutorial cards until none are visible. */
export async function dismissTutorialThrough(page: Page, maxClicks = 12) {
  for (let i = 0; i < maxClicks; i++) {
    const overlay = page.locator('#tutorial-overlay');
    if (!(await overlay.isVisible().catch(() => false))) return;
    await page.locator('#tutorial-ok').click();
    await page.waitForTimeout(200);
  }
  await expect(page.locator('#tutorial-overlay')).toBeHidden({ timeout: 5000 });
}

/** Title welcome + character select steps, then arena move step (Play path skips village). */
export async function completeTutorialThroughArenaMove(page: Page) {
  await expect(page.locator('#tutorial-overlay')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.tutorial-card h3').filter({ hasText: 'Welcome to GigaZonk' })).toBeVisible();
  await dismissTutorialStep(page);

  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.locator('.char-grid')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.tutorial-card h3').filter({ hasText: 'Choose Your Zonker' })).toBeVisible();
  await dismissTutorialStep(page);

  const confirm = page.locator('#btn-confirm');
  await confirm.scrollIntoViewIfNeeded();
  await confirm.evaluate((el) => (el as HTMLButtonElement).click());

  await expect(page.locator('#tutorial-overlay')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.tutorial-card h3').filter({ hasText: 'Move' })).toBeVisible();
  await expect(page.locator('#hp-bar')).toBeVisible();
}

/** Press Esc through the village game-menu tutorial step. */
export async function completeVillageMenuStep(page: Page) {
  await expect(page.locator('.tutorial-card h3').filter({ hasText: 'Game Menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.menu-screen')).toBeVisible({ timeout: 5000 });
  await page.locator('.menu-item').filter({ hasText: 'Resume' }).click();
  await expect(page.locator('.menu-screen')).toHaveCount(0, { timeout: 5000 });
}

/** Village hub intro after Enter Village (does not finish village action steps). */
export async function reachVillageTutorialHub(page: Page) {
  await dismissTutorialStep(page);
  await page.locator('#btn-village').click();
  await expect(page.locator('.char-grid')).toBeVisible({ timeout: 15_000 });
  await dismissTutorialStep(page);
  await page.locator('#btn-confirm').evaluate((el) => (el as HTMLButtonElement).click());
  await expect(page.getByText('🏘️ Zonka Village')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.tutorial-card h3').filter({ hasText: 'Zonka Village' })).toBeVisible();
}

/** Village hub → Esc menu → Quest Board tutorial card. */
export async function reachVillageQuestStep(page: Page) {
  await reachVillageTutorialHub(page);
  await dismissTutorialStep(page);
  await completeVillageMenuStep(page);
  await expect(page.locator('.tutorial-card h3').filter({ hasText: 'Quest Board' })).toBeVisible();
}
