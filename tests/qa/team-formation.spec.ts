import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { qaMatchName, qaPlayerName, todayIso } from './helpers/ids';
import { seedMatch, seedPlayer, makeMatchInput, makePlayerInput, cleanupSeeded } from './helpers/dataFactory';
import { findMatchById, findMatchPlayersByMatch } from './helpers/db';

test.afterEach(async () => {
  await cleanupSeeded();
});

async function pickFromLabel(page: Page, label: string, optionName: string): Promise<void> {
  await page.getByText(label, { exact: true }).locator('xpath=..').getByRole('button').click();
  await page.getByRole('listbox').getByRole('option', { name: optionName, exact: true }).click();
}

test.describe('Admin team formation', () => {
  test('renders the captain and selection panels for a draft match', async ({ adminPage }) => {
    const match = await seedMatch(
      makeMatchInput({
        name: qaMatchName(),
        seasonId: null,
        date: todayIso(),
        overs: 2,
        playersPerTeam: 3,
        teamAName: 'QA Alpha',
        teamBName: 'QA Bravo'
      })
    );

    await adminPage.goto(`/admin/matches/${match.id}/teams`);

    await expect(adminPage.getByRole('heading', { name: match.match_name, exact: true })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Captain Selection', exact: true })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Draft Selection', exact: true })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Manual Selection', exact: true })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Save Teams' })).toBeDisabled();
  });

  test('saves the teams once both captains are selected', async ({ adminPage }) => {
    const playerA = await seedPlayer(makePlayerInput(qaPlayerName()));
    const playerB = await seedPlayer(makePlayerInput(qaPlayerName()));
    const match = await seedMatch(
      makeMatchInput({
        name: qaMatchName(),
        seasonId: null,
        date: todayIso(),
        overs: 2,
        playersPerTeam: 3,
        teamAName: 'QA Alpha',
        teamBName: 'QA Bravo'
      })
    );

    await adminPage.goto(`/admin/matches/${match.id}/teams`);

    await pickFromLabel(adminPage, 'Team A Captain', playerA.display_name);
    await pickFromLabel(adminPage, 'Team B Captain', playerB.display_name);

    const saveTeams = adminPage.getByRole('button', { name: 'Save Teams' });
    await expect(saveTeams).toBeEnabled();
    await saveTeams.click();

    await expect(adminPage).toHaveURL(/\/admin\/matches\/[^/]+\/toss$/);

    await expect.poll(async () => (await findMatchById(match.id))?.status).toBe('teams_created');
    await expect.poll(async () => (await findMatchPlayersByMatch(match.id)).length).toBeGreaterThanOrEqual(2);

    const squads = await findMatchPlayersByMatch(match.id);
    expect(squads.filter((row) => row.is_captain)).toHaveLength(2);
  });

  test('keeps Save Teams disabled until both captains are selected', async ({ adminPage }) => {
    const playerA = await seedPlayer(makePlayerInput(qaPlayerName()));
    const playerB = await seedPlayer(makePlayerInput(qaPlayerName()));
    const match = await seedMatch(makeMatchInput({ name: qaMatchName(), seasonId: null, date: todayIso() }));

    await adminPage.goto(`/admin/matches/${match.id}/teams`);

    const saveTeams = adminPage.getByRole('button', { name: 'Save Teams' });
    const draftSelection = adminPage.getByRole('button', { name: 'Draft Selection' });

    await expect(saveTeams).toBeDisabled();
    await expect(draftSelection).toBeDisabled();

    await pickFromLabel(adminPage, 'Team A Captain', playerA.display_name);

    await expect(saveTeams).toBeDisabled();
    await expect(draftSelection).toBeDisabled();

    await pickFromLabel(adminPage, 'Team B Captain', playerB.display_name);

    await expect(saveTeams).toBeEnabled();
    await expect(draftSelection).toBeEnabled();
  });
});
