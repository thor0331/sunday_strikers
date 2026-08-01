import type { Availability, BallEvent, Match, MatchPlayer, PlayerStatistics } from '../types/models';
import { computeAttendanceRate } from './analytics';
import { aggregateBatting, aggregateBowling, aggregateFielding } from './seasonStatistics';

export interface PlayerStatsSource {
  matches: Match[];
  events: BallEvent[];
  matchPlayers: MatchPlayer[];
  allAvailability: Availability[];
}

export interface PlayerDashboardData {
  playerId: string;
  matchesPlayed: number;
  wins: number;
  winPct: number;
  potmCount: number;
  availabilityPct: number;
  availabilityLabel: string;
  batting: ReturnType<typeof aggregateBatting>[number] | null;
  bowling: ReturnType<typeof aggregateBowling>[number] | null;
  fielding: ReturnType<typeof aggregateFielding>[number] | null;
  statsLike: PlayerStatistics;
  recentMatches: { id: string; name: string; date: string; result: string }[];
}

export function buildPlayerDashboardData(playerId: string, source: PlayerStatsSource): PlayerDashboardData {
  const { matches, events, matchPlayers, allAvailability } = source;

  const batting = aggregateBatting(events).find((s) => s.playerId === playerId) ?? null;
  const bowling = aggregateBowling(events).find((s) => s.playerId === playerId) ?? null;
  const fielding = aggregateFielding(events).find((s) => s.playerId === playerId) ?? null;

  const playerInMatch = new Set(
    matchPlayers.filter((mp) => mp.player_id === playerId).map((mp) => mp.match_id)
  );
  const teamByMatch = new Map(
    matchPlayers.filter((mp) => mp.player_id === playerId).map((mp) => [mp.match_id, mp.team])
  );

  const playedMatches = matches.filter((m) => playerInMatch.has(m.id));
  const matchesPlayed = playedMatches.length;
  const wins = playedMatches.filter((m) => m.winner != null && m.winner === teamByMatch.get(m.id)).length;
  const winPct = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

  const potmCount = matches.filter((m) => m.player_of_match_id === playerId).length;

  const playerAvailability = allAvailability.filter((a) => a.player_id === playerId);
  const playerAvailById = new Map(playerAvailability.map((a) => [a.match_id, a.status]));
  const availabilityResponses = matches.filter((m) => playerAvailById.has(m.id));
  const availableCount = availabilityResponses.filter((m) => playerAvailById.get(m.id) === 'available').length;
  const availabilityPct = computeAttendanceRate(availabilityResponses.length, availableCount);

  const recentMatches = playedMatches
    .slice()
    .sort((a, b) => b.match_date.localeCompare(a.match_date))
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      name: m.match_name,
      date: m.match_date,
      result: m.result_text ?? '',
    }));

  const statsLike: PlayerStatistics = {
    id: '',
    player_id: playerId,
    season_id: null,
    matches_played: matchesPlayed,
    batting_innings: batting?.innings ?? 0,
    runs: batting?.runs ?? 0,
    balls_faced: batting?.ballsFaced ?? 0,
    fours: batting?.fours ?? 0,
    sixes: batting?.sixes ?? 0,
    outs: batting?.outs ?? 0,
    highest_score: batting?.highestScore ?? 0,
    bowling_innings: bowling?.innings ?? 0,
    balls_bowled: bowling?.ballsBowled ?? 0,
    runs_conceded: bowling?.runsConceded ?? 0,
    wickets: bowling?.wickets ?? 0,
    maidens: bowling?.maidens ?? 0,
    catches: fielding?.catches ?? 0,
    run_outs: fielding?.runOuts ?? 0,
    stumpings: fielding?.stumpings ?? 0,
    created_at: '',
    updated_at: '',
  };

  return {
    playerId,
    matchesPlayed,
    wins,
    winPct,
    potmCount,
    availabilityPct,
    availabilityLabel: `${availableCount}/${availabilityResponses.length}`,
    batting,
    bowling,
    fielding,
    statsLike,
    recentMatches,
  };
}
