import { test, expect } from '@playwright/test';
import { gotoClean } from './helpers/navigation.js';
import {
  startQuickArena,
  startVillage,
  startArenaAndPickLevelUp,
  openSkillTreeViaDev,
  openQuestBoardViaDev,
  pauseArenaAndResume,
} from './helpers/gameFlow.js';

test.describe('GigaZonk smoke', () => {
  test('title screen loads', async ({ page }) => {
    await gotoClean(page);
    await expect(page.getByRole('heading', { name: 'GigaZonk', exact: true })).toBeVisible();
    await expect(page.locator('#btn-play')).toBeVisible();
    await expect(page.locator('#btn-leaderboard')).toBeVisible();
    await expect(page.locator('#game-canvas')).toBeVisible();
  });

  test('leaderboard opens from title', async ({ page }) => {
    await gotoClean(page);
    await page.locator('#btn-leaderboard').click();
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
    await page.locator('#btn-leaderboard-close').click();
    await expect(page.locator('#btn-play')).toBeVisible();
  });

  test('play flow reaches arena HUD', async ({ page }) => {
    await gotoClean(page);
    await startQuickArena(page);
    await expect(page.locator('#time-stat')).toBeVisible();
    await expect(page.locator('#enemy-stat')).toContainText('Enemies');
  });

  test('village flow shows hub HUD', async ({ page }) => {
    await gotoClean(page);
    await startVillage(page);
    await expect(page.locator('#interact-prompt')).toHaveClass(/hidden/);
  });

  test('arena dev level-up picks an upgrade', async ({ page }) => {
    await gotoClean(page, '/?dev=1');
    await startArenaAndPickLevelUp(page);
    await expect(page.locator('#buff-bar-track .buff-chip').first()).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'GigaZonk', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('title shows daily challenge label', async ({ page }) => {
    await gotoClean(page);
    await expect(page.locator('.title-daily')).toContainText(/Daily:/);
  });

  test('skill tree opens from village dev hook', async ({ page }) => {
    await gotoClean(page, '/?dev=1&coins=500');
    await startVillage(page);
    await openSkillTreeViaDev(page);
    await expect(page.locator('.skill-node').first()).toBeVisible();
  });

  test('quest board opens from dev hook', async ({ page }) => {
    await gotoClean(page, '/?dev=1');
    await startVillage(page);
    await openQuestBoardViaDev(page);
    await expect(page.locator('.quest-board-scroll')).toBeVisible();
  });

  test('arena run pauses to village and resumes', async ({ page }) => {
    await gotoClean(page, '/?dev=1');
    await startQuickArena(page);
    await pauseArenaAndResume(page);
    await expect(page.locator('#time-stat')).toBeVisible();
  });
});
