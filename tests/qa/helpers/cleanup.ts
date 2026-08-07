import { adminDb, canWriteDb } from './db';

export type CleanupReport = {
  deleted: string[];
  skipped: string[];
  failures: { target: string; reason: string }[];
};

/**
 * Best-effort deletion of an isolated QA match.
 * Deleting the match row cascades to innings, ball_events, match_players,
 * availability and match_awards (all FKs are ON DELETE CASCADE).
 */
export async function cleanupMatch(matchId: string): Promise<void> {
  await adminDb().from('matches').delete().eq('id', matchId).throwOnError();
}

export async function cleanupMatches(matchIds: string[]): Promise<void> {
  for (const id of matchIds) await cleanupMatch(id);
}

export async function cleanupSeason(seasonId: string): Promise<void> {
  const { data, error } = await adminDb()
    .from('matches')
    .select('id')
    .eq('season_id', seasonId);
  if (error) throw error;
  for (const m of data ?? []) await cleanupMatch(m.id);
  await adminDb().from('seasons').delete().eq('id', seasonId).throwOnError();
}

export async function cleanupPlayer(playerIds: string[]): Promise<void> {
  for (const id of playerIds) {
    const { data, error } = await adminDb()
      .from('match_players')
      .select('match_id')
      .eq('player_id', id);
    if (error) throw error;
    for (const mp of data ?? []) await cleanupMatch(mp.match_id);
    await adminDb().from('players').delete().eq('id', id).throwOnError();
  }
}

/**
 * Delete all QA-tagged resources (name LIKE '<prefix>%'). Run from a
 * maintenance job or at the end of a run to sweep stale data from aborted runs.
 */
export async function sweepTaggedData(prefix = 'QA-'): Promise<CleanupReport> {
  const report: CleanupReport = { deleted: [], skipped: [], failures: [] };
  if (!canWriteDb()) {
    report.skipped.push('all (no SUPABASE_SERVICE_ROLE_KEY)');
    return report;
  }

  const { data: seasons, error: seasonErr } = await adminDb()
    .from('seasons')
    .select('id')
    .like('name', `${prefix}%`);
  if (seasonErr) {
    report.failures.push({ target: 'seasons', reason: seasonErr.message });
  }
  for (const s of seasons ?? []) {
    try {
      await cleanupSeason(s.id);
      report.deleted.push(`season:${s.id}`);
    } catch (e) {
      report.failures.push({ target: `season:${s.id}`, reason: String(e) });
    }
  }

  const { data: matches, error: matchErr } = await adminDb()
    .from('matches')
    .select('id')
    .like('match_name', `${prefix}%`);
  if (matchErr) {
    report.failures.push({ target: 'matches', reason: matchErr.message });
  }
  for (const m of matches ?? []) {
    try {
      await cleanupMatch(m.id);
      report.deleted.push(`match:${m.id}`);
    } catch (e) {
      report.failures.push({ target: `match:${m.id}`, reason: String(e) });
    }
  }

  const { data: players, error: playerErr } = await adminDb()
    .from('players')
    .select('id')
    .like('display_name', `${prefix}%`);
  if (playerErr) {
    report.failures.push({ target: 'players', reason: playerErr.message });
  }
  for (const p of players ?? []) {
    try {
      await cleanupPlayer([p.id]);
      report.deleted.push(`player:${p.id}`);
    } catch (e) {
      report.failures.push({ target: `player:${p.id}`, reason: String(e) });
    }
  }

  return report;
}