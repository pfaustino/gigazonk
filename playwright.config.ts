import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;
const baseURL = `http://localhost:${PORT}`;

/** Firefox/WebKit need a display + headed mode for WebGL on Linux CI (Mozilla #1375585). */
const crossHeaded = Boolean(process.env.CROSS_BROWSER && process.env.CI);

const crossBrowsers = [
  {
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      headless: crossHeaded ? false : undefined,
      launchOptions: {
        firefoxUserPrefs: {
          'webgl.force-enabled': true,
          'webgl.disabled': false,
          'webgl.forbid-software': false,
        },
      },
    },
  },
  {
    name: 'webkit',
    use: {
      ...devices['Desktop Safari'],
      headless: crossHeaded ? false : undefined,
    },
  },
];

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CROSS_BROWSER ? 1 : process.env.CI ? 1 : 4,
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
          testMatch: ['smoke.spec.ts', 'tutorial.spec.ts', 'mobile-landscape.spec.ts'],
        },
      ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
