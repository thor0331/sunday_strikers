import type { Database } from '../../../src/types/database';
import { adminDb, canWriteDb } from './db';
import { qaMatchName } from './ids';
import { cleanupMatch, cleanupPlayer, cleanupSeason } from './cleanup';

export type SeasonInput = Database['public']['Tables']['seasons']['Insert'];
export type MatchInput = Database['public']['Tables']['matches']['Insert'];
export type PlayerInput = Database['public']['Tables']['players']['Insert'];
export type MatchPlayerInput = Database['public']['Tables']['match_players']['Insert'];
export type InningsInput = Database['public']['Tables']['innings']['Insert'];
export type BallEventInput = Database['public']['Tables']['ball_events']['Insert'];

/**
 * Every record seeded by this factory is unique per call and auto-tracked for
 * cleanup. Data created through the UI (seasons/matches in the specs) should be
 * registered via `trackSeeded` so it is cleaned up at the end of the test too.
 */

const seededSeasons: string[] = [];
const seededMatches: string[] = [];
const seededPlayers: string[] = [];

export function trackSeason(id: string): string {
  seededSeasons.push(id);
  return id;
}
export function trackMatch(id: string): string {
  seededMatches.push(id);
  return id;
}
export function trackPlayer(id: string): string {
  seededPlayers.push(id);
  return id;
}

/** Run once per spec (afterEach). Idempotent and best-effort. */
export async function cleanupSeeded(): Promise<void> {
  const errors: string[] = [];

  for (const id of seededMatches) {
    try {
      await cleanupMatch(id);
    } catch (e) {
      errors.push(`match:${id} ${String(e)}`);
    }
  }
  seededMatches.length = 0;

  for (const id of seededPlayers) {
    try {
      await cleanupPlayer([id]);
    } catch (e) {
      errors.push(`player:${id} ${String(e)}`);
    }
  }
  seededPlayers.length = 0;

  for (const id of seededSeasons) {
    try {
      await cleanupSeason(id);
    } catch (e) {
      errors.push(`season:${id} ${String(e)}`);
    }
  }
  seededSeasons.length = 0;

  const failure = errors.join('; ');
  if (failure) throw new Error(`cleanupSeeded partial failures: ${failure}`);
}

export function makeSeasonInput(name: string, startDate: string): SeasonInput {
  return { name, start_date: startDate, is_active: false };
}

export function makePlayerInput(name: string): PlayerInput {
  return {
    display_name: name,
    status: 'active',
  };
}

export function makeMatchInput(input: {
  name: string;
  seasonId: string | null;
  date: string;
  teamAName?: string;
  teamBName?: string;
  overs?: number;
  playersPerTeam?: number;
  status?: MatchInput['status'];
  captains?: { a: string | null; b: string | null };
}): MatchInput {
  const { captains } = input;
  return {
    match_name: input.name,
    season_id: input.seasonId,
    match_date: input.date,
    match_number: null,
    venue: 'QA Pitch',
    overs_per_innings: input.overs ?? 2,
    players_per_team: input.playersPerTeam ?? 5,
    team_a_name: input.teamAName ?? 'QA Alpha',
    team_b_name: input.teamBName ?? 'QA Bravo',
    team_a_captain_id: captains?.a ?? null,
    team_b_captain_id: captains?.b ?? null,
    status: input.status ?? 'draft',
    is_super_over: false,
    match_format: 'short_boundary',
  };
}

/** Ensure the ability to write seed data; throws with guidance otherwise. */
function requireWriteAccess(what: string): void {
  if (!canWriteDb()) {
    throw new Error(
      `Cannot seed ${what} directly: SUPABASE_SERVICE_ROLE_KEY is not set. ` +
        `Seed through the admin UI flow instead, or provide the service-role key.`
    );
  }
}

export async function seedSeason(input: SeasonInput) {
  requireWriteAccess('a season');
  const { data, error } = await adminDb().from('seasons').insert(input).select().single();
  if (error) throw error;
  trackSeason(data.id);
  return data;
}

export async function seedPlayer(input: PlayerInput) {
  requireWriteAccess('a player');
  const { data, error } = await adminDb().from('players').insert(input).select().single();
  if (error) throw error;
  trackPlayer(data.id);
  return data;
}

export async function seedMatch(input: MatchInput) {
  requireWriteAccess('a match');
  const { data, error } = await adminDb().from('matches').insert(input).select().single();
  if (error) throw error;
  trackMatch(data.id);
  return data;
}