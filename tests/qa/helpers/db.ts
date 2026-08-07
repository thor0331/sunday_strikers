import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/database';
import { loadLocalEnv, envRequired, envOptional } from './env';

loadLocalEnv();

export type SeasonRow = Database['public']['Tables']['seasons']['Row'];
export type MatchRow = Database['public']['Tables']['matches']['Row'];
export type PlayerRow = Database['public']['Tables']['players']['Row'];
export type InningsRow = Database['public']['Tables']['innings']['Row'];
export type BallEventRow = Database['public']['Tables']['ball_events']['Row'];
export type MatchPlayerRow = Database['public']['Tables']['match_players']['Row'];
export type AvailabilityRow = Database['public']['Tables']['availability']['Row'];
export type MatchAwardRow = Database['public']['Tables']['match_awards']['Row'];
export type PlayerStatRow = Database['public']['Tables']['player_statistics']['Row'];

let readClient: SupabaseClient<Database> | null = null;
let privilegedClient: SupabaseClient<Database> | null = null;
let privilegedAvailable: boolean | null = null;

const supabaseUrl = (): string => envRequired('VITE_SUPABASE_URL');
const anonKey = (): string => envRequired('VITE_SUPABASE_ANON_KEY');

/**
 * Read-only client (anon key). Public SELECT policies allow verifying data
 * created through the UI. Used for DB assertions, never for writes.
 */
export function db(): SupabaseClient<Database> {
  if (!readClient) readClient = createClient<Database>(supabaseUrl(), anonKey());
  return readClient;
}

/**
 * Privileged client (service-role key) that bypasses RLS. Used ONLY for
 * seeding isolated test data and for deterministic cleanup. Falls back to the
 * anon client when the service-role key is absent so verification still works.
 */
export function adminDb(): SupabaseClient<Database> {
  if (privilegedClient) return privilegedClient;
  const serviceRole = envOptional('SUPABASE_SERVICE_ROLE_KEY');
  privilegedClient = createClient<Database>(supabaseUrl(), serviceRole || anonKey());
  privilegedAvailable = Boolean(serviceRole);
  return privilegedClient;
}

/** Whether hard-write/delete operations are allowed (service-role key present). */
export function canWriteDb(): boolean {
  if (privilegedAvailable !== null) return privilegedAvailable;
  privilegedAvailable = Boolean(envOptional('SUPABASE_SERVICE_ROLE_KEY'));
  return privilegedAvailable;
}

async function selectOne(
  table: string,
  field: string,
  value: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await db()
    .from(table)
    .select('*')
    .eq(field, value)
    .maybeSingle();
  if (error) {
    throw new Error(`[db] select ${table} by ${field}: ${error.message}`);
  }
  return (data as Record<string, unknown>) ?? null;
}

export const findSeasonByName = (name: string): Promise<SeasonRow | null> =>
  selectOne('seasons', 'name', name) as Promise<SeasonRow | null>;

export const findMatchByName = (name: string): Promise<MatchRow | null> =>
  selectOne('matches', 'match_name', name) as Promise<MatchRow | null>;

export const findPlayerByName = (name: string): Promise<PlayerRow | null> =>
  selectOne('players', 'display_name', name) as Promise<PlayerRow | null>;

export async function findMatchById(id: string): Promise<MatchRow | null> {
  return selectOne('matches', 'id', id) as Promise<MatchRow | null>;
}

export async function findPlayerById(id: string): Promise<PlayerRow | null> {
  return selectOne('players', 'id', id) as Promise<PlayerRow | null>;
}

export async function findInningsByMatch(matchId: string): Promise<InningsRow[]> {
  const { data, error } = await db()
    .from('innings')
    .select('*')
    .eq('match_id', matchId)
    .order('innings_number', { ascending: true });
  if (error) throw new Error(`[db] innings by match: ${error.message}`);
  return (data ?? []) as InningsRow[];
}

export async function findBallEventsByMatch(matchId: string): Promise<BallEventRow[]> {
  const { data, error } = await db()
    .from('ball_events')
    .select('*')
    .eq('match_id', matchId)
    .order('sequence_number', { ascending: true });
  if (error) throw new Error(`[db] ball_events by match: ${error.message}`);
  return (data ?? []) as BallEventRow[];
}

export async function findMatchPlayersByMatch(matchId: string): Promise<MatchPlayerRow[]> {
  const { data, error } = await db()
    .from('match_players')
    .select('*')
    .eq('match_id', matchId)
    .order('batting_order', { ascending: true });
  if (error) throw new Error(`[db] match_players by match: ${error.message}`);
  return (data ?? []) as MatchPlayerRow[];
}

export async function findAvailabilityByMatch(matchId: string): Promise<AvailabilityRow[]> {
  const { data, error } = await db()
    .from('availability')
    .select('*')
    .eq('match_id', matchId);
  if (error) throw new Error(`[db] availability by match: ${error.message}`);
  return (data ?? []) as AvailabilityRow[];
}

export async function findAwardsByMatch(matchId: string): Promise<MatchAwardRow[]> {
  const { data, error } = await db()
    .from('match_awards')
    .select('*')
    .eq('match_id', matchId);
  if (error) throw new Error(`[db] match_awards by match: ${error.message}`);
  return (data ?? []) as MatchAwardRow[];
}

export async function findStatisticsByPlayer(playerId: string): Promise<PlayerStatRow[]> {
  const { data, error } = await db()
    .from('player_statistics')
    .select('*')
    .eq('player_id', playerId);
  if (error) throw new Error(`[db] player_statistics by player: ${error.message}`);
  return (data ?? []) as PlayerStatRow[];
}

/** Count of matches in a season (for "delete season when unused" checks). */
export async function countMatchesInSeason(seasonId: string): Promise<number> {
  const { data, error } = await db()
    .from('matches')
    .select('id')
    .eq('season_id', seasonId);
  if (error) throw new Error(`[db] count matches in season: ${error.message}`);
  return (data ?? []).length;
}

/** Matches a player is linked to in any way (ball_events, squads, captains). */
export async function findMatchesForPlayer(playerId: string): Promise<MatchRow[]> {
  const { data, error } = await db()
    .from('matches')
    .select('*')
    .or(`team_a_captain_id.eq.${playerId},team_b_captain_id.eq.${playerId}`);
  if (error) throw new Error(`[db] captain matches for player: ${error.message}`);

  const { data: squadData, error: squadError } = await db()
    .from('match_players')
    .select('match_id')
    .eq('player_id', playerId);
  if (squadError) throw new Error(`[db] squad matches for player: ${squadError.message}`);

  const { data: ballData, error: ballError } = await db()
    .from('ball_events')
    .select('match_id')
    .eq('striker_id', playerId)
    .or(`non_striker_id.eq.${playerId},bowler_id.eq.${playerId}`);
  if (ballError) throw new Error(`[db] ball matches for player: ${ballError.message}`);

  const ids = new Set<string>();
  for (const m of data ?? []) ids.add(m.id);
  for (const s of squadData ?? []) ids.add(s.match_id);
  for (const b of ballData ?? []) ids.add(b.match_id);

  if (ids.size === 0) return [];
  const { data: finalRows, error: finalError } = await db()
    .from('matches')
    .select('*')
    .in('id', [...ids]);
  if (finalError) throw new Error(`[db] resolve matches for player: ${finalError.message}`);
  return (finalRows ?? []) as MatchRow[];
}