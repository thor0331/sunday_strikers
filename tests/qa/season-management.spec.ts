import { test, expect } from '../fixtures';
import { qaSeasonName, todayIso } from './helpers/ids';
import { trackSeason, cleanupSeeded } from './helpers/dataFactory';
import { findSeasonByName } from './helpers/db';

test.afterEach(async () => {
  await cleanupSeeded();
});

test.describe('Admin season management', () => {
  test('creates a season through the admin UI and persists it', async ({ adminPage }) => {
    const seasonName = qaSeasonName();
    const startDate = todayIso();
    const endDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    await adminPage.goto('/admin/seasons');
    await expect(adminPage.getByRole('heading', { name: 'Manage Seasons', exact: true })).toBeVisible();

    await adminPage.getByLabel('Season Name').fill(seasonName);
    await adminPage.getByLabel('Start Date').fill(startDate);
    await adminPage.getByLabel('End Date').fill(endDate);
    await adminPage.getByRole('button', { name: 'Create Season' }).click();

    await expect(adminPage.getByText('Season saved.', { exact: true })).toBeVisible();
    await expect(adminPage.locator('article').filter({ hasText: seasonName }).first()).toBeVisible();

    const row = await findSeasonByName(seasonName);
    expect(row).not.toBeNull();
    expect(row!.start_date).toBe(startDate);
    expect(row!.end_date).toBe(endDate);
    if (row) trackSeason(row.id);
  });

  test('sets a season active', async ({ adminPage }) => {
    const seasonName = qaSeasonName();

    await adminPage.goto('/admin/seasons');
    await adminPage.getByLabel('Season Name').fill(seasonName);
    await adminPage.getByLabel('Start Date').fill(todayIso());
    await adminPage.getByRole('button', { name: 'Create Season' }).click();
    await expect(adminPage.getByText('Season saved.', { exact: true })).toBeVisible();

    const original = await findSeasonByName(seasonName);
    expect(original).not.toBeNull();
    if (original) trackSeason(original.id);

    const seasonCard = adminPage.locator('article').filter({ hasText: seasonName }).first();
    await seasonCard.getByRole('button', { name: 'Set Active' }).click();

    await expect(adminPage.getByText('Active season updated.', { exact: true })).toBeVisible();
    await expect(seasonCard.getByText('Active season', { exact: true })).toBeVisible();

    await expect.poll(async () => {
      const season = await findSeasonByName(seasonName);
      return season?.is_active ?? false;
    }).toBe(true);
  });

  test('edits a season', async ({ adminPage }) => {
    const seasonName = qaSeasonName();
    const updatedName = `${seasonName}-Renamed`;
    const endDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    await adminPage.goto('/admin/seasons');
    await adminPage.getByLabel('Season Name').fill(seasonName);
    await adminPage.getByLabel('Start Date').fill(todayIso());
    await adminPage.getByRole('button', { name: 'Create Season' }).click();
    await expect(adminPage.getByText('Season saved.', { exact: true })).toBeVisible();

    const original = await findSeasonByName(seasonName);
    expect(original).not.toBeNull();
    if (original) trackSeason(original.id);

    const seasonCard = adminPage.locator('article').filter({ hasText: seasonName }).first();
    await seasonCard.getByRole('button', { name: 'Edit' }).click();

    await adminPage.getByLabel('Season Name').fill(updatedName);
    await adminPage.getByLabel('End Date').fill(endDate);
    await adminPage.getByRole('button', { name: 'Save Season' }).click();

    await expect(adminPage.getByText('Season saved.', { exact: true })).toBeVisible();
    await expect(adminPage.locator('article').filter({ hasText: updatedName }).first()).toBeVisible();

    const updated = await findSeasonByName(updatedName);
    expect(updated).not.toBeNull();
    expect(updated!.end_date).toBe(endDate);
  });

  test('deletes a season after confirmation', async ({ adminPage }) => {
    const seasonName = qaSeasonName();

    await adminPage.goto('/admin/seasons');
    await adminPage.getByLabel('Season Name').fill(seasonName);
    await adminPage.getByLabel('Start Date').fill(todayIso());
    await adminPage.getByRole('button', { name: 'Create Season' }).click();
    await expect(adminPage.getByText('Season saved.', { exact: true })).toBeVisible();

    const original = await findSeasonByName(seasonName);
    expect(original).not.toBeNull();
    if (original) trackSeason(original.id);

    const seasonCard = adminPage.locator('article').filter({ hasText: seasonName }).first();
    await adminPage.once('dialog', (dialog) => void dialog.accept());
    await seasonCard.getByRole('button', { name: 'Delete' }).click();

    await expect(adminPage.getByText('Season deleted successfully.', { exact: true })).toBeVisible();
    await expect(adminPage.locator('article').filter({ hasText: seasonName })).toHaveCount(0);
    await expect.poll(() => findSeasonByName(seasonName)).toBeNull();
  });
});
