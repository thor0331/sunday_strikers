import type { Match } from '../types/models';
import type { PlayerInningsScore } from './analytics';

export interface RecentFormCell {
  matchId: string;
  matchName: string;
  matchDate: string;
  runs: number | null;
  balls: number | null;
  isOut: boolean;
  isPotm: boolean;
  played: boolean;
  rating: number;
}

export interface RecentFormInput {
  playerId: string;
  matches: Match[];
  inningsHistory: PlayerInningsScore[];
  potmMatchIds: Set<string>;
  limit?: number;
}

/** 0-100 batting form rating. Rewards volume with a strike-rate bonus. */
export function battingRating(runs: number, balls: number, isOut: boolean): number {
  if (runs <= 0) return isOut ? 5 : 15;
  let rating = Math.min((runs / 40) * 70, 70);
  if (balls > 0) {
    const strikeRate = (runs / balls) * 100;
    rating += Math.min((strikeRate / 150) * 30, 30);
  }
  return Math.round(Math.min(rating, 100));
}

/**
 * Builds a per-match recent-form strip for a player, newest match first.
 * Matches the player did not take part in render as grey "did not play"
 * cells for context.
 */
export function computeRecentForm(input: RecentFormInput): RecentFormCell[] {
  const { playerId, matches, inningsHistory, potmMatchIds, limit = 10 } = input;

  const inningsByMatchName = new Map(inningsHistory.map((ih) => [ih.matchName, ih]));

  const completed = matches
    .filter((m) => m.status === 'completed' && !m.is_super_over)
    .sort((a, b) => b.match_date.localeCompare(a.match_date))
    .slice(0, limit);

  return completed.map((m) => {
    const innings = inningsByMatchName.get(m.match_name);
    const playedAsCaptain = m.team_a_captain_id === playerId || m.team_b_captain_id === playerId;
    const played = playedAsCaptain || Boolean(innings);

    if (!played) {
      return {
        matchId: m.id,
        matchName: m.match_name,
        matchDate: m.match_date,
        runs: null,
        balls: null,
        isOut: false,
        isPotm: false,
        played: false,
        rating: 0,
      };
    }

    const runs = innings?.runs ?? 0;
    const balls = innings?.balls ?? 0;
    const isOut = innings?.isOut ?? false;

    return {
      matchId: m.id,
      matchName: m.match_name,
      matchDate: m.match_date,
      runs,
      balls,
      isOut,
      isPotm: potmMatchIds.has(m.id),
      played: true,
      rating: battingRating(runs, balls, isOut),
    };
  });
}
