import { test, expect } from '../fixtures';
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
import { adminDb, findBallEventsByMatch, findInningsByMatch, type PlayerRow } from './helpers/db';

test.afterEach(async () => {
  await cleanupSeeded();
});

async function seedInnings(matchId: string, status: InningsInput['status'] = 'not_started'): Promise<string> {
  const rows: InningsInput[] = [
    { match_id: matchId, innings_number: 1, batting_team: 'team_a', bowling_team: 'team_b', status, target_runs: null },
    { match_id: matchId, innings_number: 2, batting_team: 'team_b', bowling_team: 'team_a', status: 'not_started', target_runs: null }
  ];
  const { data, error } = await adminDb().from('innings').insert(rows).select();
  if (error) throw error;
  return data![0].id;
}

async function seedSquads(matchId: string, teamA: PlayerRow[], teamB: PlayerRow[]): Promise<void> {
  const rows: MatchPlayerInput[] = [
    ...teamA.map((p, i) => ({ match_id: matchId, player_id: p.id, team: 'team_a' as const, batting_order: i + 1, is_captain: i === 0 })),
    ...teamB.map((p, i) => ({ match_id: matchId, player_id: p.id, team: 'team_b' as const, batting_order: i + 1, is_captain: i === 0 }))
  ];
  const { error } = await adminDb().from('match_players').insert(rows);
  if (error) throw error;
}

async function pickOpeningPlayer(page: Page, label: string, playerName: string): Promise<void> {
  await page.getByText(label, { exact: true }).locator('xpath=..').getByRole('button').click();
  await page.getByRole('listbox').getByRole('option', { name: playerName, exact: true }).click();
}

async function seedScoringPlayers(): Promise<{ a: PlayerRow[]; b: PlayerRow[] }> {
  const a = await Promise.all([0, 1, 2].map(() => seedPlayer(makePlayerInput(qaPlayerName()))));
  const b = await Promise.all([0, 1, 2].map(() => seedPlayer(makePlayerInput(qaPlayerName()))));
  return { a, b };
}

function seedMatchInProgress(): ReturnType<typeof seedMatch> {
  return seedMatch(
    makeMatchInput({
      name: qaMatchName(),
      seasonId: null,
      date: todayIso(),
      overs: 2,
      playersPerTeam: 3,
      teamAName: 'QA Alpha',
      teamBName: 'QA Bravo',
      status: 'in_progress'
    })
  );
}

test.describe('Admin live scoring', () => {
  test('starts an innings and records runs', async ({ adminPage }) => {
    const { a, b } = await seedScoringPlayers();
    const match = await seedMatchInProgress();
    await seedInnings(match.id);
    await seedSquads(match.id, a, b);

    await adminPage.goto(`/admin/matches/${match.id}/scoring`);

    await expect(adminPage.getByRole('heading', { name: 'Select Opening Players', exact: true })).toBeVisible();

    await pickOpeningPlayer(adminPage, 'Opening Striker', a[0].display_name);
    await pickOpeningPlayer(adminPage, 'Opening Non-Striker', a[1].display_name);
    await pickOpeningPlayer(adminPage, 'Opening Bowler', b[0].display_name);

    await adminPage.getByRole('button', { name: 'Start Innings' }).click();

    const undo = adminPage.getByRole('button', { name: /Undo/ });
    await expect(undo).toBeVisible();

    await adminPage.keyboard.press('1');
    await expect.poll(async () => (await findBallEventsByMatch(match.id)).length).toBe(1);
    await adminPage.keyboard.press('4');
    await expect.poll(async () => (await findBallEventsByMatch(match.id)).length).toBe(2);

    await expect(undo).toBeEnabled();
    await expect(adminPage.getByText('Last 6', { exact: true })).toBeVisible();

    const events = await findBallEventsByMatch(match.id);
    const totalRuns = events.reduce((sum, e) => sum + e.runs_batter + e.runs_extra, 0);
    expect(totalRuns).toBe(5);
  });

  test('undoes the last recorded ball after confirmation', async ({ adminPage }) => {
    const { a, b } = await seedScoringPlayers();
    const match = await seedMatchInProgress();
    const innings1Id = await seedInnings(match.id, 'in_progress');
    await seedSquads(match.id, a, b);

    const ball: BallEventInput = {
      match_id: match.id,
      innings_id: innings1Id,
      sequence_number: 1,
      over_number: 0,
      ball_in_over: 1,
      striker_id: a[0].id,
      non_striker_id: a[1].id,
      bowler_id: b[0].id,
      runs_batter: 1,
      runs_extra: 0,
      extra_type: null,
      is_wicket: false,
      wicket_type: null,
      dismissed_player_id: null,
      fielder_id: null,
      is_legal_delivery: true
    };
    const { error } = await adminDb().from('ball_events').insert(ball);
    if (error) throw error;

    await adminPage.goto(`/admin/matches/${match.id}/scoring`);

    const undo = adminPage.getByRole('button', { name: /Undo/ });
    await expect(undo).toBeEnabled();

    await adminPage.once('dialog', (dialog) => void dialog.accept());
    await undo.click();

    await expect.poll(async () => (await findBallEventsByMatch(match.id)).length).toBe(0);
  });

  test('does not start an innings until all opening players are selected', async ({ adminPage }) => {
    const { a, b } = await seedScoringPlayers();
    const match = await seedMatchInProgress();
    await seedInnings(match.id);
    await seedSquads(match.id, a, b);

    await adminPage.goto(`/admin/matches/${match.id}/scoring`);

    await expect(adminPage.getByRole('heading', { name: 'Select Opening Players', exact: true })).toBeVisible();

    await adminPage.getByRole('button', { name: 'Start Innings' }).click();

    await expect(adminPage.getByRole('heading', { name: 'Select Opening Players', exact: true })).toBeVisible();

    const innings = await findInningsByMatch(match.id);
    expect(innings[0].status).toBe('not_started');
    expect(await findBallEventsByMatch(match.id)).toHaveLength(0);
  });
});
