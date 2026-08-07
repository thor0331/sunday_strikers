import { test, expect } from '../fixtures';
import { qaMatchName, todayIso } from './helpers/ids';
import { seedMatch, makeMatchInput, cleanupSeeded } from './helpers/dataFactory';
import { findMatchByName } from './helpers/db';

test.afterEach(async () => {
  await cleanupSeeded();
});

test.describe('Admin dashboard', () => {
  test('renders the dashboard overview for an authenticated admin', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { name: 'Sunday Strikers', exact: true })).toBeVisible();

    const overview = adminPage
      .locator('section')
      .filter({ has: adminPage.getByText('Season Overview', { exact: true }) });
    await expect(overview).toContainText('Matches');
    await expect(overview).toContainText('Completed');
    await expect(overview).toContainText('Active');
    await expect(overview).toContainText('Win Rate');
    await expect(overview).toContainText('Players');
    await expect(overview).toContainText('Seasons');

    await expect(adminPage.getByRole('heading', { name: 'Quick Actions', exact: true })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'Recent Matches', exact: true })).toBeVisible();
    await expect(adminPage.getByRole('heading', { name: 'All Matches', exact: true })).toBeVisible();
  });

  test('quick action tiles navigate to their admin pages', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { name: 'Sunday Strikers', exact: true })).toBeVisible();

    await adminPage.getByRole('link', { name: /Manage squad/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/players$/);
    await expect(adminPage.getByRole('heading', { name: 'Manage Players', exact: true })).toBeVisible();

    await adminPage.goto('/admin');
    await adminPage.getByRole('link', { name: /Create fixture/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/matches\/new$/);
    await expect(adminPage.getByRole('heading', { name: 'Create Match', exact: true })).toBeVisible();

    await adminPage.goto('/admin');
    await adminPage.getByRole('link', { name: /Manage seasons/ }).click();
    await expect(adminPage).toHaveURL(/\/admin\/seasons$/);
  });

  test('lists a seeded draft match and deletes it after confirmation', async ({ adminPage }) => {
    const matchName = qaMatchName();
    await seedMatch(makeMatchInput({ name: matchName, seasonId: null, date: todayIso() }));

    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading', { name: 'Sunday Strikers', exact: true })).toBeVisible();

    const allMatches = adminPage.getByRole('heading', { name: 'All Matches', exact: true }).locator('xpath=..');
    const matchCard = allMatches
      .locator('div')
      .filter({ hasText: matchName })
      .filter({ has: adminPage.getByRole('button', { name: 'Delete' }) })
      .first();
    await expect(matchCard).toBeVisible();
    await expect(matchCard).toContainText('Draft');

    await adminPage.once('dialog', (dialog) => void dialog.accept());
    await matchCard.getByRole('button', { name: 'Delete' }).click();

    await expect(adminPage.getByText(matchName, { exact: true })).toHaveCount(0);
    await expect.poll(() => findMatchByName(matchName)).toBeNull();
  });
});
