import { test, expect, type Qa } from '../fixtures';
import type { Page } from '@playwright/test';
import { envRequired } from './helpers/env';
import { unique } from './helpers/ids';

const adminEmail = (): string => envRequired('ADMIN_EMAIL');
const adminPassword = (): string => envRequired('ADMIN_PASSWORD');

function watch(page: Page, qa: Qa): void {
  page.on('console', (msg) => {
    qa.consoleLogs.push(msg.text());
    if (msg.type() === 'error' || msg.type() === 'warning') {
      qa.consoleErrors.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    qa.pageErrors.push(err.message);
  });
  page.on('requestfailed', (req) => {
    qa.networkFailures.push({ kind: 'requestfailed', url: req.url(), error: req.failure()?.errorText });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      qa.networkFailures.push({ kind: 'http', status: res.status(), url: res.url() });
    }
  });
}

test.describe('Admin authentication', () => {
  test('redirects unauthenticated visitors from /admin to the login page', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { name: 'Admin Login', exact: true })).toBeVisible();
  });

  test('rejects invalid admin credentials', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(`nobody-${unique('User')}@example.com`);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByText(/invalid login credentials/i)).toBeVisible();
  });

  test('logs in with valid admin credentials', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(adminEmail());
    await page.getByLabel('Password').fill(adminPassword());
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL(/\/admin\/?$/);
    await expect(page.getByRole('heading', { name: 'Sunday Strikers', exact: true })).toBeVisible();
  });

  test('signs out of the admin dashboard and returns to the login page', async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 375, height: 700 });

    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { name: 'Sunday Strikers', exact: true })).toBeVisible();

    await adminPage.getByRole('button', { name: 'Logout' }).click();

    await expect(adminPage).toHaveURL(/\/admin\/login$/);
    await expect(adminPage.getByRole('heading', { name: 'Admin Login', exact: true })).toBeVisible();
  });
});
