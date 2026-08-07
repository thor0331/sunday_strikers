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

test.describe('Season Awards', () => {
  test('shows an empty state when there is no stats data', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/awards');

    await expect(page.getByRole('heading', { name: 'Season Awards', exact: true })).toBeVisible();
    await expect(page.getByText('No awards data available yet.', { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('shows awards for a seeded top performer', async ({ page, qa }) => {
    watch(page, qa);

    const player = await seedPlayer(makePlayerInput(qaPlayerName()));
    const season = await seedSeason(makeSeasonInput(qaSeasonName(), todayIso()));
    await adminDb()
      .from('player_statistics')
      .insert({
        player_id: player.id,
        season_id: season.id,
        matches_played: 2,
        batting_innings: 2,
        runs: 80,
        balls_faced: 40,
        fours: 8,
        sixes: 2,
        outs: 1,
        highest_score: 45,
        bowling_innings: 2,
        balls_bowled: 12,
        runs_conceded: 20,
        wickets: 4,
        maidens: 0,
        catches: 1,
        run_outs: 0,
        stumpings: 0
      })
      .throwOnError();

    await page.goto('/awards');

    await expect(page.getByText('Orange Cap', { exact: true })).toBeVisible();
    await expect(page.getByText(player.display_name, { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});