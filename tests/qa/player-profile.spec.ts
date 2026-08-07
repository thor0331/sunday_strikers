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

test.describe('Player Profile', () => {
  test('shows the career statistics for a seeded player', async ({ page, qa }) => {
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
        runs: 45,
        balls_faced: 30,
        fours: 4,
        sixes: 1,
        outs: 1,
        highest_score: 40,
        bowling_innings: 2,
        balls_bowled: 12,
        runs_conceded: 16,
        wickets: 3,
        maidens: 0,
        catches: 1,
        run_outs: 0,
        stumpings: 0
      })
      .throwOnError();

    await page.goto(`/players/${player.id}`);

    await expect(page.getByRole('heading', { name: 'Player Profile', exact: true })).toBeVisible();
    await expect(page.getByText(player.display_name, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Career Statistics', { exact: true })).toBeVisible();

    await expect(page.getByText('45', { exact: true }).first()).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('shows a not-found message for an unknown player', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/players/00000000-0000-0000-0000-000000000000');

    await expect(page.getByText('Player not found.', { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});