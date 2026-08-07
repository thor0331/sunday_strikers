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

test.describe('Hall of Fame', () => {
  test('renders the page with threshold selectors', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/hall-of-fame');

    await expect(page.getByRole('heading', { name: 'Hall of Fame', exact: true })).toBeVisible();
    await expect(page.getByText('Min Innings (SR):', { exact: true })).toBeVisible();
    await expect(page.getByText('Min Overs (Eco):', { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('shows a record for a seeded top run scorer', async ({ page, qa }) => {
    watch(page, qa);

    const player = await seedPlayer(makePlayerInput(qaPlayerName()));
    const season = await seedSeason(makeSeasonInput(qaSeasonName(), todayIso()));
    await adminDb()
      .from('player_statistics')
      .insert({
        player_id: player.id,
        season_id: season.id,
        matches_played: 3,
        batting_innings: 3,
        runs: 120,
        balls_faced: 60,
        fours: 10,
        sixes: 5,
        outs: 2,
        highest_score: 60,
        bowling_innings: 1,
        balls_bowled: 6,
        runs_conceded: 10,
        wickets: 1,
        maidens: 0,
        catches: 0,
        run_outs: 0,
        stumpings: 0
      })
      .throwOnError();

    await page.goto('/hall-of-fame');

    await expect(page.getByText('Most Runs', { exact: true })).toBeVisible();
    await expect(page.getByText(player.display_name, { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});