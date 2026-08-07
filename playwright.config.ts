import { defineConfig, devices } from '@playwright/test';
import { loadLocalEnv } from './tests/qa/helpers/env';

loadLocalEnv('.env.local');

const isCI = Boolean(process.env.CI);
const baseURL = process.env.QA_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 1,
  workers: process.env.QA_WORKERS ? Number(process.env.QA_WORKERS) : undefined,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/report.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['./tests/reporter'],
  ],

  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  outputDir: 'test-results',

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
