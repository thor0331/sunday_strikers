import { test, expect } from '../fixtures';
import { unique } from './helpers/ids';
import { cleanupSeeded } from './helpers/dataFactory';
import { adminDb } from './helpers/db';

type AboutRow = { id: string; title: string; content: string };

let originalContent: AboutRow | null = null;

async function ensureAboutContent(): Promise<void> {
  const { data, error } = await adminDb().from('app_content').select('id').eq('key', 'about_page').maybeSingle();
  if (error) throw error;
  if (data) return;
  const { error: insertError } = await adminDb().from('app_content').insert({
    key: 'about_page',
    title: 'About Sunday Strikers',
    content: JSON.stringify({ description: '', features: [], footerNote: '', profilePhotoUrl: '' })
  });
  if (insertError) throw insertError;
}

async function fetchAboutRow(): Promise<AboutRow> {
  const { data, error } = await adminDb().from('app_content').select('id, title, content').eq('key', 'about_page').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('about_page content row is missing');
  return data as AboutRow;
}

async function restoreAboutContent(): Promise<void> {
  if (!originalContent) return;
  await adminDb()
    .from('app_content')
    .update({ title: originalContent.title, content: originalContent.content })
    .eq('id', originalContent.id)
    .throwOnError();
  originalContent = null;
}

test.afterEach(async () => {
  await restoreAboutContent();
  await cleanupSeeded();
});

test.describe('Admin site content', () => {
  test('renders the about page editor for an admin', async ({ adminPage }) => {
    await ensureAboutContent();

    await adminPage.goto('/admin/content');

    await expect(adminPage.getByRole('heading', { name: 'About Page Editor', exact: true })).toBeVisible();
    await expect(adminPage.getByLabel('Club Name')).toBeVisible();
    await expect(adminPage.getByLabel('About Club')).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('saves about page content and persists the changes', async ({ adminPage }) => {
    const clubName = unique('ClubName');
    const aboutText = unique('AboutText');

    await ensureAboutContent();
    originalContent = await fetchAboutRow();

    await adminPage.goto('/admin/content');
    await expect(adminPage.getByRole('heading', { name: 'About Page Editor', exact: true })).toBeVisible();

    await adminPage.getByLabel('Club Name').fill(clubName);
    await adminPage.getByLabel('About Club').fill(aboutText);
    await adminPage.getByRole('button', { name: 'Save Changes' }).click();

    await expect(adminPage.getByText('About page content saved successfully.', { exact: true })).toBeVisible();

    await expect.poll(async () => {
      const row = await fetchAboutRow();
      const parsed = JSON.parse(row.content);
      return parsed.clubName ?? null;
    }).toBe(clubName);

    const saved = await fetchAboutRow();
    const parsed = JSON.parse(saved.content);
    expect(parsed.aboutClub).toBe(aboutText);
  });

  test('discards unsaved changes when the editor is reloaded', async ({ adminPage }) => {
    await ensureAboutContent();
    const original = await fetchAboutRow();
    const originalParsed = JSON.parse(original.content);
    const originalClubName = originalParsed.clubName ?? '';

    await adminPage.goto('/admin/content');
    await expect(adminPage.getByRole('heading', { name: 'About Page Editor', exact: true })).toBeVisible();

    await adminPage.getByLabel('Club Name').fill(unique('UnsavedName'));

    await adminPage.reload();
    await expect(adminPage.getByRole('heading', { name: 'About Page Editor', exact: true })).toBeVisible();

    await expect(adminPage.getByLabel('Club Name')).toHaveValue(originalClubName);
  });
});
