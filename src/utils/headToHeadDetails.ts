import type { Match, Innings, BallEvent } from '../types/models';
import { computeHeadToHead } from './analytics';
import { computeLargestSuccessfulChase, computeMostConsecutiveWins } from './matchAnalytics';

export interface HeadToHeadDetails {
  matchesPlayed: number;
  teamAWins: number;
  teamBWins: number;
  draws: number;
  teamAWinPercentage: number;
  teamBWinPercentage: number;
  averageScore: number | null;
  highestChase: { runs: number; target: number; chaserName: string; overs: string } | null;
  longestStreak: { teamName: string; streak: number } | null;
}

export function computeHeadToHeadDetails(
  h2hMatches: Match[],
  teamAName: string,
  teamBName: string,
  h2hInnings: Pick<Innings, 'id' | 'match_id' | 'innings_number' | 'batting_team'>[],
  events: BallEvent[]
): HeadToHeadDetails {
  const base = computeHeadToHead(h2hMatches, teamAName, teamBName);

  const inningsRuns = new Map<string, number>();
  const inningsBalls = new Map<string, number>();
  for (const event of events) {
    inningsRuns.set(event.inningsId, (inningsRuns.get(event.inningsId) ?? 0) + event.runsBatter + event.runsExtra);
    if (event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball') {
      inningsBalls.set(event.inningsId, (inningsBalls.get(event.inningsId) ?? 0) + 1);
    }
  }

  const inningsScores = Array.from(inningsRuns.values()).filter((r) => r > 0);
  const averageScore = inningsScores.length > 0
    ? Math.round(inningsScores.reduce((s, r) => s + r, 0) / inningsScores.length)
    : null;

  const completed = h2hMatches.filter((m) => m.status === 'completed');
  const chase = computeLargestSuccessfulChase(completed, h2hInnings, inningsRuns, inningsBalls);
  const highestChase = chase
    ? {
        runs: chase.chaseRuns,
        target: chase.target,
        chaserName: chase.chaserName,
        overs: `${Math.floor(chase.ballsUsed / 6)}.${chase.ballsUsed % 6}`,
      }
    : null;

  const streak = computeMostConsecutiveWins(completed);

  return { ...base, averageScore, highestChase, longestStreak: streak };
}
