import { test, expect } from '../fixtures';
import { qaMatchName, qaPlayerName, todayIso } from './helpers/ids';
import { seedMatch, seedPlayer, makeMatchInput, makePlayerInput, trackMatch, cleanupSeeded } from './helpers/dataFactory';
import { findMatchByName } from './helpers/db';

test.afterEach(async () => {
  await cleanupSeeded();
});

test.describe('Admin match creation', () => {
  test('creates a match and proceeds to team setup', async ({ adminPage }) => {
    const matchName = qaMatchName();

    await adminPage.goto('/admin/matches/new');
    await expect(adminPage.getByRole('heading', { name: 'Create Match', exact: true })).toBeVisible();

    await adminPage.getByLabel('Match Name').fill(matchName);
    await adminPage.getByLabel('Match Date').fill(todayIso());
    await adminPage.getByLabel('Venue').fill('QA Oval');
    await adminPage.getByLabel('Team A Name').fill('QA Chargers');
    await adminPage.getByLabel('Team B Name').fill('QA Blasters');

    await adminPage.getByRole('button', { name: 'Create Match' }).click();

    await expect(adminPage).toHaveURL(/\/admin\/matches\/[^/]+\/teams$/);
    await expect(adminPage.getByRole('heading', { name: 'Captain Selection', exact: true })).toBeVisible();

    const row = await findMatchByName(matchName);
    expect(row).not.toBeNull();
    expect(row!.status).toBe('draft');
    if (row) trackMatch(row.id);
  });

  test('blocks creating a match without a name', async ({ adminPage }) => {
    await adminPage.goto('/admin/matches/new');
    await adminPage.getByLabel('Match Date').fill(todayIso());

    await adminPage.getByRole('button', { name: 'Create Match' }).click();

    await expect(adminPage).toHaveURL(/\/admin\/matches\/new$/);
    await expect(adminPage.getByRole('heading', { name: 'Create Match', exact: true })).toBeVisible();
  });

  test('edits a seeded match from edit mode', async ({ adminPage }) => {
    const originalName = qaMatchName();
    const updatedName = `${originalName}-Renamed`;
    const seeded = await seedMatch(makeMatchInput({ name: originalName, seasonId: null, date: todayIso(), overs: 6, playersPerTeam: 6 }));

    await adminPage.goto(`/admin/matches/${seeded.id}/edit`);
    await expect(adminPage.getByRole('heading', { name: 'Edit Match', exact: true })).toBeVisible();
    await expect(adminPage.getByLabel('Match Name')).toHaveValue(originalName);

    await adminPage.getByLabel('Match Name').fill(updatedName);
    await adminPage.getByRole('button', { name: 'Save Match' }).click();

    await expect(adminPage).toHaveURL(/\/admin\/?$/);

    await expect.poll(async () => {
      const match = await findMatchByName(updatedName);
      return match?.id ?? null;
    }).toBe(seeded.id);
  });

  test('selecting captains creates a scheduled match', async ({ adminPage }) => {
    const playerA = await seedPlayer(makePlayerInput(qaPlayerName()));
    const playerB = await seedPlayer(makePlayerInput(qaPlayerName()));
    const matchName = qaMatchName();

    await adminPage.goto('/admin/matches/new');
    await adminPage.getByLabel('Match Name').fill(matchName);
    await adminPage.getByLabel('Match Date').fill(todayIso());

    await adminPage.getByText('Team A Captain', { exact: true }).locator('xpath=..').getByRole('button').click();
    await adminPage.getByRole('listbox').getByRole('option', { name: playerA.display_name, exact: true }).click();

    await adminPage.getByText('Team B Captain', { exact: true }).locator('xpath=..').getByRole('button').click();
    await adminPage.getByRole('listbox').getByRole('option', { name: playerB.display_name, exact: true }).click();

    await adminPage.getByRole('button', { name: 'Create Match' }).click();

    await expect(adminPage).toHaveURL(/\/admin\/matches\/[^/]+\/teams$/);

    const row = await findMatchByName(matchName);
    expect(row).not.toBeNull();
    expect(row!.status).toBe('scheduled');
    expect(row!.team_a_captain_id).toBe(playerA.id);
    expect(row!.team_b_captain_id).toBe(playerB.id);
    if (row) trackMatch(row.id);
  });
});
