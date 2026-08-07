import { test, expect } from '../fixtures';
import { qaMatchName, todayIso } from './helpers/ids';
import { seedMatch, makeMatchInput, cleanupSeeded } from './helpers/dataFactory';
import { findMatchById, findInningsByMatch } from './helpers/db';

test.afterEach(async () => {
  await cleanupSeeded();
});

test.describe('Admin toss', () => {
  test('renders the toss form with both teams and batting decisions', async ({ adminPage }) => {
    const match = await seedMatch(
      makeMatchInput({
        name: qaMatchName(),
        seasonId: null,
        date: todayIso(),
        teamAName: 'QA Alpha',
        teamBName: 'QA Bravo',
        status: 'teams_created'
      })
    );

    await adminPage.goto(`/admin/matches/${match.id}/toss`);

    await expect(adminPage.getByRole('heading', { name: 'Toss', exact: true })).toBeVisible();
    await expect(adminPage.getByText('Toss Winner', { exact: true })).toBeVisible();
    await expect(adminPage.getByText('Decision', { exact: true })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Save Toss' })).toBeVisible();
  });

  test('saves a toss and creates both innings', async ({ adminPage }) => {
    const match = await seedMatch(
      makeMatchInput({
        name: qaMatchName(),
        seasonId: null,
        date: todayIso(),
        teamAName: 'QA Alpha',
        teamBName: 'QA Bravo',
        status: 'teams_created'
      })
    );

    await adminPage.goto(`/admin/matches/${match.id}/toss`);

    await adminPage.getByText('Toss Winner', { exact: true }).locator('xpath=..').getByRole('button').click();
    await adminPage.getByRole('listbox').getByRole('option', { name: 'QA Bravo', exact: true }).click();

    await adminPage.getByText('Decision', { exact: true }).locator('xpath=..').getByRole('button').click();
    await adminPage.getByRole('listbox').getByRole('option', { name: 'Bowl', exact: true }).click();

    await adminPage.getByRole('button', { name: 'Save Toss' }).click();

    await expect(adminPage).toHaveURL(/\/admin\/matches\/[^/]+\/scoring$/);

    await expect.poll(async () => (await findMatchById(match.id))?.status).toBe('toss_completed');

    const row = await findMatchById(match.id);
    expect(row).not.toBeNull();
    expect(row!.toss_winner).toBe('team_b');
    expect(row!.toss_decision).toBe('bowl');
    expect(row!.batting_first).toBe('team_b');

    const innings = await findInningsByMatch(match.id);
    expect(innings).toHaveLength(2);
    expect(innings[0].innings_number).toBe(1);
    expect(innings[0].batting_team).toBe('team_b');
    expect(innings[0].bowling_team).toBe('team_a');
  });

  test('blocks the scoring page until a toss has been conducted', async ({ adminPage }) => {
    const match = await seedMatch(makeMatchInput({ name: qaMatchName(), seasonId: null, date: todayIso() }));

    await adminPage.goto(`/admin/matches/${match.id}/scoring`);

    await expect(adminPage.getByText('Toss Pending', { exact: true })).toBeVisible();
    await expect(adminPage.getByText('Toss Required to Start Scoring', { exact: true })).toBeVisible();

    await adminPage.getByRole('button', { name: 'Go to Toss Page' }).click();
    await expect(adminPage).toHaveURL(/\/admin\/matches\/[^/]+\/toss$/);
  });
});
