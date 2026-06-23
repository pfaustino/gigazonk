import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const baseURL = `http://localhost:${PORT}`;

const crossBrowsers = [
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
];

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CROSS_BROWSER ? 1 : process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: {
    timeout: process.env.CROSS_BROWSER ? 20_000 : 5_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Smoke: Chromium only. Cross-browser: Firefox + WebKit (Chromium covered by smoke job).
  projects: process.env.CROSS_BROWSER
    ? crossBrowsers.map((browser) => ({
        ...browser,
        testMatch: 'cross-browser.spec.ts',
      }))
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
          testMatch: 'smoke.spec.ts',
        },
      ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
