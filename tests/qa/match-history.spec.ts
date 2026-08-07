import { test, expect, type Qa } from '../fixtures';
import type { Page } from '@playwright/test';
import { qaMatchName, qaPlayerName, todayIso } from './helpers/ids';
import { seedMatch, seedPlayer, makeMatchInput, makePlayerInput, cleanupSeeded } from './helpers/dataFactory';
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

test.describe('Match History', () => {
  test('lists completed matches and hides non-completed ones', async ({ page, qa }) => {
    watch(page, qa);

    const completedName = qaMatchName();
    const draftName = qaMatchName();
    const winnerName = 'QA Alpha';
    const { matchId } = await seedCompletedMatch(completedName, winnerName);
    await seedMatch(makeMatchInput({ name: draftName, seasonId: null, date: todayIso(), status: 'draft' }));

    await page.goto('/matches/history');

    await expect(page.getByRole('heading', { name: 'Match History', exact: true })).toBeVisible();
    await expect(page.getByText(completedName, { exact: true })).toBeVisible();
    await expect(page.getByText(draftName, { exact: true })).toHaveCount(0);
    await expect(page.getByText(winnerName, { exact: true }).first()).toBeVisible();

    const matchRow = await adminDb().from('matches').select('status').eq('id', matchId).single();
    expect(matchRow.data!.status).toBe('completed');

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('navigates to the match center and team comparison', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/matches/history');

    await page.getByRole('link', { name: /Match Center/ }).click();
    await expect(page).toHaveURL(/\/matches$/);

    await page.goto('/matches/history');
    await page.getByRole('link', { name: /Team Comparison/ }).click();
    await expect(page).toHaveURL(/\/teams$/);
    await expect(page.getByRole('heading', { name: 'Team Comparison', exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});

async function seedCompletedMatch(matchName: string, winnerName: string): Promise<{ matchId: string }> {
  const a = await Promise.all([0, 1, 2].map(() => seedPlayer(makePlayerInput(qaPlayerName()))));
  const b = await Promise.all([0, 1, 2].map(() => seedPlayer(makePlayerInput(qaPlayerName()))));

  const match = await seedMatch(
    makeMatchInput({
      name: matchName,
      seasonId: null,
      date: todayIso(),
      overs: 1,
      playersPerTeam: 3,
      teamAName: winnerName,
      teamBName: 'QA Bravo',
      status: 'completed',
      captains: { a: a[0].id, b: b[0].id }
    })
  );

  const { error } = await adminDb()
    .from('matches')
    .update({
      winner: 'team_a',
      result_text: `${winnerName} won by 3 runs`,
      toss_winner: 'team_a',
      toss_decision: 'bat',
      batting_first: 'team_a',
      player_of_match_id: a[0].id
    })
    .eq('id', match.id);
  if (error) throw error;

  return { matchId: match.id };
}