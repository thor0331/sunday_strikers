import { test, expect, type Qa } from '../fixtures';
import type { Page } from '@playwright/test';
import { qaMatchName, todayIso } from './helpers/ids';
import { seedMatch, makeMatchInput, cleanupSeeded } from './helpers/dataFactory';
import { findMatchByName } from './helpers/db';

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

test.describe('Match Center', () => {
  test('renders seeded matches across the default filter', async ({ page, qa }) => {
    watch(page, qa);

    const draftName = qaMatchName();
    const completedName = qaMatchName();
    const liveName = qaMatchName();
    await seedMatch(makeMatchInput({ name: draftName, seasonId: null, date: todayIso(), status: 'draft' }));
    await seedMatch(makeMatchInput({ name: completedName, seasonId: null, date: todayIso(), status: 'completed' }));
    await seedMatch(makeMatchInput({ name: liveName, seasonId: null, date: todayIso(), status: 'in_progress' }));

    await page.goto('/matches');

    await expect(page.getByText('Live Now', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('🔴 Live', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: liveName })).toBeVisible();
    await expect(page.getByRole('link', { name: completedName })).toBeVisible();
    await expect(page.getByRole('link', { name: draftName })).toBeVisible();

    const liveCard = page.getByRole('link', { name: liveName }).locator('xpath=..').locator('xpath=..');
    await expect(liveCard.getByRole('link', { name: 'Watch Live' })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('filters the match list by status', async ({ page, qa }) => {
    watch(page, qa);

    const draftName = qaMatchName();
    const completedName = qaMatchName();
    await seedMatch(makeMatchInput({ name: draftName, seasonId: null, date: todayIso(), status: 'draft' }));
    await seedMatch(makeMatchInput({ name: completedName, seasonId: null, date: todayIso(), status: 'completed' }));

    await page.goto('/matches');

    await page.getByRole('button', { name: '✅ Completed' }).click();

    await expect(page.getByRole('link', { name: completedName })).toBeVisible();
    await expect(page.getByRole('link', { name: draftName })).toHaveCount(0);

    const completedRow = await findMatchByName(completedName);
    expect(completedRow).not.toBeNull();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});