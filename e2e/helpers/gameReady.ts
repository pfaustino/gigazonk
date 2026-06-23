import { expect, type Page } from '@playwright/test';

const READY_TIMEOUT = 60_000;

/** Wait until the app reports title boot complete (see src/lib/gameReady.js). */
export async function waitForGameReady(page: Page, phase: string, timeout = READY_TIMEOUT) {
  await expect(page.locator(`html[data-game-ready="${phase}"]`)).toBeVisible({ timeout });
}
