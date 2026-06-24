/**
 * Headed playtest demo — opens a visible browser and walks through recent changes.
 * Usage: node scripts/playtest-showcase.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://localhost:5173/?dev=1&seed=42';
const SHOTS = '.playtest-screenshots';
const PAUSE_MS = 3500;

async function pause(page, ms = PAUSE_MS) {
  await page.waitForTimeout(ms);
}

async function clickCanvas(page) {
  const canvas = page.locator('#game-container canvas, canvas').first();
  await canvas.click({ position: { x: 400, y: 300 }, force: true });
}

async function startArena(page) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.removeItem('gigazonk_save'));
  await page.reload();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Play' }).click();
  await page.locator('.char-grid').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#btn-confirm').evaluate((el) => el.click());
  await page.locator('#hp-bar').waitFor({ state: 'visible', timeout: 30000 });
  await clickCanvas(page);
  await dismissTutorial(page);
}

async function dismissTutorial(page) {
  for (let i = 0; i < 6; i++) {
    const btn = page.getByRole('button', { name: 'Got it' });
    if (!(await btn.isVisible().catch(() => false))) break;
    await btn.click();
    await page.waitForTimeout(400);
  }
}

async function devLevelUp(page) {
  await page.locator('#dev-toggle').click();
  await page.locator('button[data-cmd="level"]').click();
  await page.locator('#levelup-overlay').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.upgrade-tag').first().waitFor({ state: 'visible', timeout: 5000 });
}

async function orbitCamp(page, seconds = 16) {
  const keys = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
  for (let i = 0; i < seconds; i++) {
    const key = keys[i % 4];
    await page.keyboard.down(key);
    await page.waitForTimeout(900);
    await page.keyboard.up(key);
  }
}

const browser = await chromium.launch({
  headless: false,
  slowMo: 60,
  args: ['--start-maximized'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

await mkdir(SHOTS, { recursive: true });

try {
  console.log('1/4 Starting arena…');
  await startArena(page);
  await page.screenshot({ path: `${SHOTS}/01-arena.png` });
  await pause(page);

  console.log('2/4 Level-up — build tags + synergy row…');
  await devLevelUp(page);
  await page.screenshot({ path: `${SHOTS}/02-levelup-tags.png`, fullPage: true });
  await pause(page, 5000);
  await page.locator('.upgrade-card').first().evaluate((el) => el.click());
  await page.locator('#levelup-overlay').waitFor({ state: 'hidden', timeout: 10000 });
  await pause(page);

  console.log('3/4 Combat — spawn horde, contact damage…');
  await page.locator('#dev-toggle').click();
  await page.locator('button[data-cmd="spawn50"]').evaluate((el) => el.click());
  await page.keyboard.down('KeyW');
  await pause(page, 6000);
  await page.keyboard.up('KeyW');
  await page.screenshot({ path: `${SHOTS}/03-combat-horde.png` });
  await pause(page);

  console.log('4/4 Anti-camp — open ground orbit for RUN! + klaxon…');
  await page.evaluate(() => {
    const g = window.__gigazonkGame;
    if (!g?.player) return;
    g.player.position.x = 0;
    g.player.position.z = 0;
  });
  await dismissTutorial(page);
  await clickCanvas(page);
  await orbitCamp(page, 18);
  const runVisible = await page.locator('#run-alert:not(.hidden)').isVisible().catch(() => false);
  if (runVisible) {
    await page.screenshot({ path: `${SHOTS}/04-run-alert.png` });
    console.log('RUN! alert captured.');
  } else {
    await page.screenshot({ path: `${SHOTS}/04-camp-orbit.png` });
    console.log('Dome may still be charging — check purple bubble on screen.');
  }
  await pause(page, 5000);

  console.log(`Screenshots saved to ${SHOTS}/`);
  console.log('Leaving browser open 15s — watch the window…');
  await pause(page, 15000);
} finally {
  await browser.close();
}
