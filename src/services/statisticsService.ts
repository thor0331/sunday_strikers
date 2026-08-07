import { supabase } from './supabaseClient';
import { statisticsRepository } from '../repositories/statisticsRepository';
import type { Database } from '../types/database';

type BallEventRow = Database['public']['Tables']['ball_events']['Row'];

interface PlayerSeasonStats {
  playerId: string;
  seasonId: string;
  matchesPlayed: number;
  battingInnings: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  outs: number;
  highestScore: number;
  bowlingInnings: number;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  catches: number;
  runOuts: number;
  stumpings: number;
}

function createEmptyStats(playerId: string, seasonId: string): PlayerSeasonStats {
  return {
    playerId,
    seasonId,
    matchesPlayed: 0,
    battingInnings: 0,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    outs: 0,
    highestScore: 0,
    bowlingInnings: 0,
    ballsBowled: 0,
    runsConceded: 0,
    wickets: 0,
    maidens: 0,
    catches: 0,
    runOuts: 0,
    stumpings: 0
  };
}

function computePlayerSeasonStats(
  playerId: string,
  seasonId: string,
  matchIds: Set<string>,
  allEvents: BallEventRow[],
  matchPlayerMap: Map<string, Set<string>>
): PlayerSeasonStats {
  const stats = createEmptyStats(playerId, seasonId);

  // Matches played: count distinct completed matches in this season where player participated
  let matchesPlayed = 0;
  for (const [matchId, playerSet] of matchPlayerMap) {
    if (playerSet.has(playerId) && matchIds.has(matchId)) {
      matchesPlayed++;
    }
  }
  stats.matchesPlayed = matchesPlayed;

  // Filter events for this player across completed matches in this season
  const relevantEvents = allEvents.filter((e) => matchIds.has(e.match_id));

  // Batting stats: events where this player is the striker
  const battingEvents = relevantEvents.filter((e) => e.striker_id === playerId);
  const battingInningsIds = new Set(battingEvents.map((e) => e.innings_id));
  stats.battingInnings = battingInningsIds.size;
  stats.runs = battingEvents.reduce((sum, e) => sum + e.runs_batter, 0);
  stats.ballsFaced = battingEvents.filter((e) => e.is_legal_delivery && !e.extra_type).length;
  stats.fours = battingEvents.filter((e) => e.runs_batter === 4).length;
  stats.sixes = battingEvents.filter((e) => e.runs_batter === 6).length;

  // Highest score: max runs in a single innings
  const inningsRuns = new Map<string, number>();
  for (const e of battingEvents) {
    inningsRuns.set(e.innings_id, (inningsRuns.get(e.innings_id) ?? 0) + e.runs_batter);
  }
  stats.highestScore = inningsRuns.size > 0 ? Math.max(...inningsRuns.values()) : 0;

  // Outs: times dismissed
  stats.outs = relevantEvents.filter((e) => e.dismissed_player_id === playerId && e.is_wicket).length;

  // Bowling stats: events where this player is the bowler
  const bowlingEvents = relevantEvents.filter((e) => e.bowler_id === playerId);
  const bowlingInningsIds = new Set(bowlingEvents.map((e) => e.innings_id));
  stats.bowlingInnings = bowlingInningsIds.size;
  stats.ballsBowled = bowlingEvents.filter((e) => e.is_legal_delivery).length;
  stats.wickets = bowlingEvents.filter(
    (e) => e.is_wicket && ['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'].includes(e.wicket_type as string)
  ).length;

  // Runs conceded: byes/leg byes don't count against bowler
  stats.runsConceded = bowlingEvents.reduce((sum, e) => {
    if (e.extra_type === 'bye' || e.extra_type === 'leg_bye') return sum + e.runs_batter;
    return sum + e.runs_batter + e.runs_extra;
  }, 0);

  // Maidens: complete overs (6 legal balls) where bowler conceded 0 runs
  const overRuns = new Map<string, { runs: number; legalBalls: number }>();
  for (const e of bowlingEvents) {
    const key = `${e.innings_id}:${e.over_number}`;
    const entry = overRuns.get(key) ?? { runs: 0, legalBalls: 0 };
    if (e.is_legal_delivery) entry.legalBalls += 1;
    if (e.extra_type === 'bye' || e.extra_type === 'leg_bye') {
      entry.runs += e.runs_batter;
    } else {
      entry.runs += e.runs_batter + e.runs_extra;
    }
    overRuns.set(key, entry);
  }
  stats.maidens = Array.from(overRuns.values()).filter((o) => o.legalBalls === 6 && o.runs === 0).length;

  // Fielding stats
  const fieldingEvents = relevantEvents.filter((e) => e.fielder_id === playerId && e.is_wicket);
  stats.catches = fieldingEvents.filter((e) => e.wicket_type === 'caught').length;
  stats.runOuts = fieldingEvents.filter((e) => e.wicket_type === 'run_out').length;
  stats.stumpings = fieldingEvents.filter((e) => e.wicket_type === 'stumped').length;

  return stats;
}

export interface RebuildProgress {
  totalSeasons: number;
  currentSeason: number;
  seasonName: string;
  totalPlayers: number;
  currentPlayer: number;
  playerName?: string;
  message: string;
}

/**
 * Recalculate and upsert statistics for all players in a specific season.
 * This is the client-side equivalent of the database trigger function.
 */
export async function recalculateSeasonStats(
  seasonId: string,
  onProgress?: (progress: RebuildProgress) => void
): Promise<void> {
  // 1. Fetch all completed matches in this season
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .eq('season_id', seasonId)
    .eq('status', 'completed')
    .eq('is_super_over', false);

  if (matchError) throw new Error(`Failed to fetch matches: ${matchError.message}`);
  if (!matches || matches.length === 0) return;

  const matchIds = new Set(matches.map((m) => m.id));

  // 2. Fetch all match_players for these matches (to determine who played)
  const matchIdArray = Array.from(matchIds);
  const { data: matchPlayers, error: mpError } = await supabase
    .from('match_players')
    .select('match_id, player_id')
    .in('match_id', matchIdArray);

  if (mpError) throw new Error(`Failed to fetch match players: ${mpError.message}`);
  if (!matchPlayers || matchPlayers.length === 0) return;

  // Build map: matchId -> Set of playerIds
  const matchPlayerMap = new Map<string, Set<string>>();
  const allPlayerIds = new Set<string>();
  for (const mp of matchPlayers) {
    const set = matchPlayerMap.get(mp.match_id) ?? new Set();
    set.add(mp.player_id);
    matchPlayerMap.set(mp.match_id, set);
    allPlayerIds.add(mp.player_id);
  }

  // 3. Fetch all ball_events for these matches
  const { data: events, error: eventError } = await supabase
    .from('ball_events')
    .select('*')
    .in('match_id', matchIdArray)
    .order('sequence_number', { ascending: true });

  if (eventError) throw new Error(`Failed to fetch ball events: ${eventError.message}`);
  const allEvents: BallEventRow[] = events ?? [];

  // 4. Calculate stats for each player in this season
  const playerIds = Array.from(allPlayerIds);
  const statsRows: Array<{
    player_id: string;
    season_id: string;
    matches_played: number;
    batting_innings: number;
    runs: number;
    balls_faced: number;
    fours: number;
    sixes: number;
    outs: number;
    highest_score: number;
    bowling_innings: number;
    balls_bowled: number;
    runs_conceded: number;
    wickets: number;
    maidens: number;
    catches: number;
    run_outs: number;
    stumpings: number;
    updated_at: string;
  }> = [];

  for (let i = 0; i < playerIds.length; i++) {
    const playerId = playerIds[i];
    const stats = computePlayerSeasonStats(playerId, seasonId, matchIds, allEvents, matchPlayerMap);

    onProgress?.({
      totalSeasons: 1,
      currentSeason: 1,
      seasonName: seasonId,
      totalPlayers: playerIds.length,
      currentPlayer: i + 1,
      playerName: playerId,
      message: `Calculating stats for player ${i + 1}/${playerIds.length}`
    });

    statsRows.push({
      player_id: playerId,
      season_id: seasonId,
      matches_played: stats.matchesPlayed,
      batting_innings: stats.battingInnings,
      runs: stats.runs,
      balls_faced: stats.ballsFaced,
      fours: stats.fours,
      sixes: stats.sixes,
      outs: stats.outs,
      highest_score: stats.highestScore,
      bowling_innings: stats.bowlingInnings,
      balls_bowled: stats.ballsBowled,
      runs_conceded: stats.runsConceded,
      wickets: stats.wickets,
      maidens: stats.maidens,
      catches: stats.catches,
      run_outs: stats.runOuts,
      stumpings: stats.stumpings,
      updated_at: new Date().toISOString()
    });
  }

  // 5. Upsert all stats
  await statisticsRepository.upsertStatistics(statsRows);
}

/**
 * Rebuild statistics for ALL seasons. Used by the admin maintenance page.
 */
export async function rebuildAllStatistics(
  onProgress?: (progress: RebuildProgress) => void
): Promise<{ seasonsProcessed: number; playersUpdated: number; errors: string[] }> {
  const errors: string[] = [];
  let playersUpdated = 0;

  // 1. Fetch all seasons
  const { data: seasons, error: seasonError } = await supabase
    .from('seasons')
    .select('id, name')
    .order('start_date', { ascending: true });

  if (seasonError) throw new Error(`Failed to fetch seasons: ${seasonError.message}`);
  if (!seasons || seasons.length === 0) return { seasonsProcessed: 0, playersUpdated: 0, errors: [] };

  // 2. Process each season
  for (let s = 0; s < seasons.length; s++) {
    const season = seasons[s];
    onProgress?.({
      totalSeasons: seasons.length,
      currentSeason: s + 1,
      seasonName: season.name,
      totalPlayers: 0,
      currentPlayer: 0,
      message: `Processing season: ${season.name} (${s + 1}/${seasons.length})`
    });

    try {
      await recalculateSeasonStats(season.id, (progress) => {
        onProgress?.({
          ...progress,
          totalSeasons: seasons.length,
          currentSeason: s + 1,
          seasonName: season.name
        });
      });

      // Count players updated in this season
      const { count } = await supabase
        .from('player_statistics')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', season.id);

      playersUpdated += count ?? 0;
    } catch (err) {
      const msg = `Error processing season "${season.name}": ${err instanceof Error ? err.message : 'Unknown error'}`;
      errors.push(msg);
      console.error('[StatisticsService]', msg, err);
    }
  }

  return { seasonsProcessed: seasons.length, playersUpdated, errors };
}

/**
 * Recalculate statistics for a single match completion.
 * Called after a match is marked as completed.
 */
export async function updateStatsForCompletedMatch(
  matchId: string,
  onProgress?: (message: string) => void
): Promise<void> {
  // 1. Fetch the match to get its season_id
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, season_id')
    .eq('id', matchId)
    .single();

  if (matchError) throw new Error(`Failed to fetch match: ${matchError.message}`);
  if (!match || !match.season_id) {
    onProgress?.('Match has no season assigned. Skipping statistics update.');
    return;
  }

  onProgress?.('Recalculating player statistics...');
  await recalculateSeasonStats(match.season_id, (progress) => {
    onProgress?.(progress.message);
  });
  onProgress?.('Player statistics updated successfully.');
}
