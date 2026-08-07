import { test, expect, type Qa } from '../fixtures';
import type { Page } from '@playwright/test';
import { qaMatchName, qaPlayerName, todayIso } from './helpers/ids';
import {
  seedMatch,
  seedPlayer,
  makeMatchInput,
  makePlayerInput,
  cleanupSeeded,
  type InningsInput,
  type MatchPlayerInput,
  type BallEventInput
} from './helpers/dataFactory';
import { adminDb, findInningsByMatch, type PlayerRow } from './helpers/db';

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

test.describe('Club Records', () => {
  test('renders the page title and description', async ({ page, qa }) => {
    watch(page, qa);

    await page.goto('/records');

    await expect(page.getByRole('heading', { name: 'Club Records', exact: true })).toBeVisible();
    await expect(page.getByText('All-time best performances', { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });

  test('shows career records for a seeded completed match', async ({ page, qa }) => {
    watch(page, qa);

    await seedCompletedMatch();

    await page.goto('/records');

    await expect(page.getByText('Highest Individual Score', { exact: true })).toBeVisible();
    await expect(page.getByText('Most Career Runs', { exact: true })).toBeVisible();
    await expect(page.getByText('Most Career Wickets', { exact: true })).toBeVisible();

    qa.assertNoPageErrors();
    qa.assertNoNetworkFailures();
  });
});

async function seedSquads(matchId: string, teamA: PlayerRow[], teamB: PlayerRow[]): Promise<void> {
  const rows: MatchPlayerInput[] = [
    ...teamA.map((p, i) => ({ match_id: matchId, player_id: p.id, team: 'team_a' as const, batting_order: i + 1, is_captain: i === 0 })),
    ...teamB.map((p, i) => ({ match_id: matchId, player_id: p.id, team: 'team_b' as const, batting_order: i + 1, is_captain: i === 0 }))
  ];
  const { error } = await adminDb().from('match_players').insert(rows);
  if (error) throw error;
}

async function insertBallEvents(matchId: string, inningsId: string, strikerId: string, nonStrikerId: string, bowlerId: string, runsList: number[]): Promise<void> {
  const rows: BallEventInput[] = runsList.map((runs, i) => ({
    match_id: matchId,
    innings_id: inningsId,
    sequence_number: i + 1,
    over_number: Math.floor(i / 6),
    ball_in_over: (i % 6) + 1,
    striker_id: strikerId,
    non_striker_id: nonStrikerId,
    bowler_id: bowlerId,
    runs_batter: runs,
    runs_extra: 0,
    extra_type: null,
    is_wicket: false,
    wicket_type: null,
    dismissed_player_id: null,
    fielder_id: null,
    is_legal_delivery: true
  }));
  const { error } = await adminDb().from('ball_events').insert(rows);
  if (error) throw error;
}

async function seedCompletedMatch(): Promise<void> {
  const a = await Promise.all([0, 1, 2].map(() => seedPlayer(makePlayerInput(qaPlayerName()))));
  const b = await Promise.all([0, 1, 2].map(() => seedPlayer(makePlayerInput(qaPlayerName()))));

  const match = await seedMatch(
    makeMatchInput({
      name: qaMatchName(),
      seasonId: null,
      date: todayIso(),
      overs: 1,
      playersPerTeam: 3,
      teamAName: 'QA Alpha',
      teamBName: 'QA Bravo',
      status: 'completed',
      captains: { a: a[0].id, b: b[0].id }
    })
  );

  await adminDb()
    .from('matches')
    .update({
      winner: 'team_a',
      result_text: 'QA Alpha won by 3 runs',
      toss_winner: 'team_a',
      toss_decision: 'bat',
      batting_first: 'team_a',
      player_of_match_id: a[0].id
    })
    .eq('id', match.id)
    .throwOnError();

  await seedSquads(match.id, a, b);

  const inningsRows: InningsInput[] = [
    { match_id: match.id, innings_number: 1, batting_team: 'team_a', bowling_team: 'team_b', status: 'completed', target_runs: null },
    { match_id: match.id, innings_number: 2, batting_team: 'team_b', bowling_team: 'team_a', status: 'completed', target_runs: 9 }
  ];
  await adminDb().from('innings').insert(inningsRows).throwOnError();

  const innings = await findInningsByMatch(match.id);
  const innings1 = innings.find((i) => i.innings_number === 1)!;
  const innings2 = innings.find((i) => i.innings_number === 2)!;

  await insertBallEvents(match.id, innings1.id, a[0].id, a[1].id, b[0].id, [4, 1, 0, 1, 1, 1]);
  await insertBallEvents(match.id, innings2.id, b[0].id, b[1].id, a[0].id, [1, 1, 0, 1, 1, 1]);
}