import { test, expect } from '../fixtures';
import { qaPlayerName } from './helpers/ids';
import { seedPlayer, makePlayerInput, trackPlayer, cleanupSeeded } from './helpers/dataFactory';
import { findPlayerByName } from './helpers/db';

test.afterEach(async () => {
  await cleanupSeeded();
});

test.describe('Admin player management', () => {
  test('creates a player through the admin UI and persists it', async ({ adminPage }) => {
    const playerName = qaPlayerName();

    await adminPage.goto('/admin/players');
    await expect(adminPage.getByRole('heading', { name: 'Manage Players', exact: true })).toBeVisible();

    await adminPage.getByLabel('Display Name').fill(playerName);
    await adminPage.getByLabel('Full Name').fill(`Full ${playerName}`);
    await adminPage.getByLabel('Batting Style').fill('Right-hand bat');
    await adminPage.getByLabel('Bowling Style').fill('Right-arm medium');

    await adminPage.getByText('Status', { exact: true }).locator('xpath=..').getByRole('button').click();
    await adminPage.getByRole('listbox').getByRole('option', { name: 'Inactive', exact: true }).click();

    await adminPage.getByRole('button', { name: 'Add Player' }).click();

    await expect(adminPage.getByText('Player saved.', { exact: true })).toBeVisible();
    await expect(adminPage.locator('article').filter({ hasText: playerName }).first()).toBeVisible();

    const row = await findPlayerByName(playerName);
    expect(row).not.toBeNull();
    expect(row!.status).toBe('inactive');
    expect(row!.full_name).toBe(`Full ${playerName}`);
    if (row) trackPlayer(row.id);
  });

  test('edits an existing player', async ({ adminPage }) => {
    const originalName = qaPlayerName();
    const updatedName = `${originalName}-Renamed`;

    await adminPage.goto('/admin/players');
    await adminPage.getByLabel('Display Name').fill(originalName);
    await adminPage.getByRole('button', { name: 'Add Player' }).click();
    await expect(adminPage.getByText('Player saved.', { exact: true })).toBeVisible();

    const original = await findPlayerByName(originalName);
    expect(original).not.toBeNull();
    if (original) trackPlayer(original.id);

    const playerRow = adminPage.locator('article').filter({ hasText: originalName }).first();
    await playerRow.getByRole('button', { name: 'Edit' }).click();

    await adminPage.getByLabel('Display Name').fill(updatedName);
    await adminPage.getByRole('button', { name: 'Save Player' }).click();

    await expect(adminPage.getByText('Player saved.', { exact: true })).toBeVisible();
    await expect(adminPage.locator('article').filter({ hasText: updatedName }).first()).toBeVisible();

    const updated = await findPlayerByName(updatedName);
    expect(updated).not.toBeNull();
    expect(updated!.display_name).toBe(updatedName);
  });

  test('deletes a seeded player after confirmation', async ({ adminPage }) => {
    const playerName = qaPlayerName();
    seedPlayer(makePlayerInput(playerName));

    await adminPage.goto('/admin/players');
    await expect(adminPage.getByRole('heading', { name: 'Manage Players', exact: true })).toBeVisible();

    const playerRow = adminPage.locator('article').filter({ hasText: playerName }).first();
    await expect(playerRow).toBeVisible();

    await adminPage.once('dialog', (dialog) => void dialog.accept());
    await playerRow.getByRole('button', { name: 'Delete' }).click();

    await expect(adminPage.locator('article').filter({ hasText: playerName })).toHaveCount(0);
    await expect.poll(() => findPlayerByName(playerName)).toBeNull();
  });

  test('blocks creating a player without a display name', async ({ adminPage }) => {
    await adminPage.goto('/admin/players');

    await adminPage.getByRole('button', { name: 'Add Player' }).click();

    await expect(adminPage.getByText('Player saved.', { exact: true })).toHaveCount(0);
    await expect(adminPage.getByRole('heading', { name: 'Manage Players', exact: true })).toBeVisible();
  });
});
