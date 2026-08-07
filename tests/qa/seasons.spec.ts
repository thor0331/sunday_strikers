import { test, expect, type Qa } from '../fixtures';
import type { Page } from '@playwright/test';
import { qaPlayerName, qaSeasonName, todayIso } from './helpers/ids';
import { seedPlayer, seedSeason, makePlayerInput, makeSeasonInput, cleanupSeeded } from './helpers/dataFactory';
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

test.describe('Seasons', () => {
  test('renders seeded seasons with an Active badge', async ({ page, qa }) => {
    watch(page, qa);

    const seasonName = qaSeasonName();
    const season = await seedSeason({ name: seasonName, start_date: todayIso(), is_active: true });

    await page.goto('/seasons');

    await expect(page.getByRole('heading', { name: 'Seasons', exact: true })).toBeVisible();
    await expect(page.getByText(seasonName, { exact: true })).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();

    const row = await adminDb().from('seasons').select('is_active').eq('id', season.id).single();
    expect(row.data!.is_active).toBe(true);

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('links to season awards and season summary', async ({ page, qa }) => {
    watch(page, qa);

    await seedSeason(makeSeasonInput(qaSeasonName(), todayIso()));

    await page.goto('/seasons');

    await page.getByRole('link', { name: /Season Awards/ }).click();
    await expect(page).toHaveURL(/\/awards$/);
    await expect(page.getByRole('heading', { name: 'Season Awards', exact: true })).toBeVisible();

    await page.goto('/seasons');
    await page.getByRole('link', { name: /Season Summary/ }).click();
    await expect(page).toHaveURL(/\/season-summary$/);

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});