import { test, expect, type Qa } from '../fixtures';
import type { Page } from '@playwright/test';
import { qaPlayerName } from './helpers/ids';
import { seedPlayer, makePlayerInput, cleanupSeeded } from './helpers/dataFactory';
import { adminDb } from './helpers/db';

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

test.describe('Players directory', () => {
  test('renders cards for seeded players with a No Stats badge', async ({ page, qa }) => {
    watch(page, qa);

    const playerA = await seedPlayer(makePlayerInput(qaPlayerName()));
    const playerB = await seedPlayer(makePlayerInput(qaPlayerName()));

    await page.goto('/players');

    await expect(page.getByRole('heading', { name: 'Players', exact: true })).toBeVisible();
    await expect(page.getByText(playerA.display_name, { exact: true })).toBeVisible();
    await expect(page.getByText(playerB.display_name, { exact: true })).toBeVisible();
    await expect(page.getByText('No Stats', { exact: true }).first()).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('expands a player card to show career stats', async ({ page, qa }) => {
    watch(page, qa);

    const player = await seedPlayer(makePlayerInput(qaPlayerName()));

    await page.goto('/players');

    await page.getByText(player.display_name, { exact: true }).click();

    await expect(page.getByText('Career Overview', { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});