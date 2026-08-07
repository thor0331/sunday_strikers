import { test, expect, type Qa } from '../fixtures';
import type { Page } from '@playwright/test';
import { qaPlayerName } from './helpers/ids';
import { seedPlayer, makePlayerInput, cleanupSeeded } from './helpers/dataFactory';

test.afterEach(async () => {
  await cleanupSeeded();
});

function watch(page: Page, qa: Qa): void {
  page.on('console', (msg) => {
    qa.consoleLogs.push(msg.text());
    if (msg.type() === 'error' || msg.type() === 'warning') {
      qa.consoleErrors.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => qa.pageErrors.push(err.message));
  page.on('requestfailed', (req) => qa.networkFailures.push({ kind: 'requestfailed', url: req.url(), error: req.failure()?.errorText }));
  page.on('response', (res) => {
    if (res.status() >= 400) qa.networkFailures.push({ kind: 'http', status: res.status(), url: res.url() });
  });
}

test.describe('My Dashboard', () => {
  test('prompts to select a player when none is chosen', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/my-dashboard');

    await expect(page.getByRole('heading', { name: 'My Dashboard', exact: true })).toBeVisible();
    await expect(page.getByText('Select a player to view their dashboard.', { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('shows a player dashboard after selecting a seeded player', async ({ page, qa }) => {
    watch(page, qa);

    const player = await seedPlayer(makePlayerInput(qaPlayerName()));

    await page.goto('/my-dashboard');

    await page.getByText('Select Player', { exact: true }).locator('xpath=..').getByRole('button').click();
    await page.getByRole('listbox').getByRole('option', { name: player.display_name, exact: true }).click();

    await expect(page.getByText(player.display_name, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('No Stats', { exact: true }).first()).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});