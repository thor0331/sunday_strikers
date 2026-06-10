import type { PlayerStatistics, Match, Innings, BallEvent, Player } from '../types/models';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
}

export function computeAchievements(stats: PlayerStatistics | undefined, potmCount: number): Achievement[] {
  const s = stats;
  return [
    {
      id: 'first-fifty',
      title: 'First Fifty',
      description: 'Score 50 runs in a single innings',
      icon: '50',
      unlocked: (s?.highest_score ?? 0) >= 50,
      progress: { current: Math.min(s?.highest_score ?? 0, 50), target: 50 }
    },
    {
      id: 'first-century',
      title: 'First Century',
      description: 'Score 100 runs in a single innings',
      icon: '100',
      unlocked: (s?.highest_score ?? 0) >= 100,
      progress: { current: Math.min(s?.highest_score ?? 0, 100), target: 100 }
    },
    {
      id: '100-runs',
      title: '100 Career Runs',
      description: 'Reach 100 total runs',
      icon: '🏃',
      unlocked: (s?.runs ?? 0) >= 100,
      progress: { current: Math.min(s?.runs ?? 0, 100), target: 100 }
    },
    {
      id: '500-runs',
      title: '500 Career Runs',
      description: 'Reach 500 total runs',
      icon: '🏃',
      unlocked: (s?.runs ?? 0) >= 500,
      progress: { current: Math.min(s?.runs ?? 0, 500), target: 500 }
    },
    {
      id: '1000-runs',
      title: '1000 Career Runs',
      description: 'Reach 1000 total runs',
      icon: '🏃',
      unlocked: (s?.runs ?? 0) >= 1000,
      progress: { current: Math.min(s?.runs ?? 0, 1000), target: 1000 }
    },
    {
      id: 'first-wicket',
      title: 'First Wicket',
      description: 'Take your first wicket',
      icon: 'W',
      unlocked: (s?.wickets ?? 0) >= 1,
      progress: { current: Math.min(s?.wickets ?? 0, 1), target: 1 }
    },
    {
      id: '3-wicket-haul',
      title: '3 Wicket Haul',
      description: 'Take 3 wickets in a match',
      icon: '🎯',
      unlocked: false,
    },
    {
      id: '5-wicket-haul',
      title: '5 Wicket Haul',
      description: 'Take 5 wickets in a match',
      icon: '🎯',
      unlocked: false,
    },
    {
      id: '25-wickets',
      title: '25 Career Wickets',
      description: 'Reach 25 total wickets',
      icon: '🎳',
      unlocked: (s?.wickets ?? 0) >= 25,
      progress: { current: Math.min(s?.wickets ?? 0, 25), target: 25 }
    },
    {
      id: '50-wickets',
      title: '50 Career Wickets',
      description: 'Reach 50 total wickets',
      icon: '🎳',
      unlocked: (s?.wickets ?? 0) >= 50,
      progress: { current: Math.min(s?.wickets ?? 0, 50), target: 50 }
    },
    {
      id: 'potm',
      title: 'Player of the Match',
      description: 'Win a Player of the Match award',
      icon: '🏆',
      unlocked: potmCount >= 1,
      progress: { current: Math.min(potmCount, 1), target: 1 }
    },
    {
      id: 'multi-potm',
      title: 'Multiple POTM Awards',
      description: 'Win 5+ Player of the Match awards',
      icon: '🏆',
      unlocked: potmCount >= 5,
      progress: { current: Math.min(potmCount, 5), target: 5 }
    },
  ];
}

export type FormRating = 'excellent' | 'average' | 'needs_improvement';

export function computeFormRating(stats: PlayerStatistics | undefined): FormRating {
  if (!stats || stats.matches_played === 0) return 'needs_improvement';
  const avgRuns = stats.runs / stats.matches_played;
  const avgWickets = stats.wickets / stats.matches_played;
  if (avgRuns >= 20 || avgWickets >= 1.5) return 'excellent';
  if (avgRuns >= 10 || avgWickets >= 0.5) return 'average';
  return 'needs_improvement';
}

export interface TeamStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number;
  avgScore: number;
  highestScore: number;
  totalRuns: number;
  totalWickets: number;
}

export function computeTeamStats(matches: Match[], teamSide: 'team_a' | 'team_b'): TeamStats {
  const teamMatches = matches.filter(m => m.status === 'completed');
  const stats = teamMatches.reduce(
    (acc, m) => {
      const isTeamA = teamSide === 'team_a';
      const won = m.winner === teamSide;
      const lost = m.winner !== null && m.winner !== teamSide;
      return {
        matchesPlayed: acc.matchesPlayed + 1,
        wins: acc.wins + (won ? 1 : 0),
        losses: acc.losses + (lost ? 1 : 0),
      };
    },
    { matchesPlayed: 0, wins: 0, losses: 0 }
  );

  return {
    ...stats,
    winPercentage: stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0,
    avgScore: 0,
    highestScore: 0,
    totalRuns: 0,
    totalWickets: 0,
  };
}

export function computeHeadToHead(matches: Match[], teamAName: string, teamBName: string) {
  const h2h = matches.filter(
    m => m.status === 'completed' &&
    ((m.team_a_name === teamAName && m.team_b_name === teamBName) ||
     (m.team_a_name === teamBName && m.team_b_name === teamAName))
  );

  const teamAWins = h2h.filter(m =>
    (m.team_a_name === teamAName && m.winner === 'team_a') ||
    (m.team_b_name === teamAName && m.winner === 'team_b')
  ).length;

  const teamBWins = h2h.filter(m =>
    (m.team_a_name === teamBName && m.winner === 'team_a') ||
    (m.team_b_name === teamBName && m.winner === 'team_b')
  ).length;

  return {
    matchesPlayed: h2h.length,
    teamAWins,
    teamBWins,
    draws: h2h.length - teamAWins - teamBWins,
    teamAWinPercentage: h2h.length > 0 ? Math.round((teamAWins / h2h.length) * 100) : 0,
    teamBWinPercentage: h2h.length > 0 ? Math.round((teamBWins / h2h.length) * 100) : 0,
  };
}

export interface PlayerInningsScore {
  runs: number;
  balls: number;
  isOut: boolean;
  matchDate: string;
  matchName: string;
}

export function computePlayerInningsScores(
  playerId: string,
  ballEventsByInnings: { innings: Innings; events: BallEvent[]; match: Match }[]
): PlayerInningsScore[] {
  return ballEventsByInnings
    .filter(({ events }) => events.some(e => e.strikerId === playerId))
    .map(({ events, match }) => {
      const playerEvents = events.filter(e => e.strikerId === playerId);
      const runs = playerEvents.reduce((sum, e) => sum + e.runsBatter, 0);
      const balls = playerEvents.filter(e => e.isLegalDelivery).length;
      const isOut = events.some(e => e.dismissedPlayerId === playerId);
      return { runs, balls, isOut, matchDate: match.match_date, matchName: match.match_name };
    })
    .slice(-5)
    .reverse();
}

export interface StreakInfo {
  type: 'runs' | 'wickets' | 'potm' | 'matches';
  count: number;
  label: string;
  active: boolean;
}

export function computeStreaks(
  playerId: string,
  matches: Match[],
  ballEventsByInnings: { innings: Innings; events: BallEvent[]; match: Match }[]
): StreakInfo[] {
  const completedMatches = matches
    .filter(m => m.status === 'completed')
    .sort((a, b) => b.match_date.localeCompare(a.match_date));

  const matchStreak = computeConsecutive(completedMatches, m =>
    m.team_a_captain_id === playerId || m.team_b_captain_id === playerId ||
    ballEventsByInnings.some(bei => bei.match.id === m.id && bei.events.some(e => e.strikerId === playerId || e.bowlerId === playerId))
  );

  const scoringStreak = computeConsecutive(completedMatches, m =>
    ballEventsByInnings.some(bei =>
      bei.match.id === m.id &&
      bei.events.some(e => e.strikerId === playerId && e.runsBatter > 0)
    )
  );

  const wicketStreak = computeConsecutive(completedMatches, m =>
    ballEventsByInnings.some(bei =>
      bei.match.id === m.id &&
      bei.events.some(e => e.bowlerId === playerId && e.isWicket)
    )
  );

  const potmStreak = computeConsecutive(completedMatches, m => m.player_of_match_id === playerId);

  const streaks: StreakInfo[] = [];
  if (matchStreak >= 2) streaks.push({ type: 'matches', count: matchStreak, label: 'Match Streak', active: true });
  if (scoringStreak >= 2) streaks.push({ type: 'runs', count: scoringStreak, label: 'Scoring Streak', active: true });
  if (wicketStreak >= 2) streaks.push({ type: 'wickets', count: wicketStreak, label: 'Wicket Streak', active: true });
  if (potmStreak >= 2) streaks.push({ type: 'potm', count: potmStreak, label: 'POTM Streak', active: true });
  return streaks;
}

function computeConsecutive(matches: Match[], predicate: (m: Match) => boolean): number {
  let count = 0;
  for (const match of matches) {
    if (predicate(match)) count++;
    else break;
  }
  return count;
}

export interface SeasonAward {
  playerId: string;
  playerName: string;
  category: string;
  value: string | number;
  icon: string;
}

export function computeSeasonAwards(stats: PlayerStatistics[], playerMap: Map<string, string>): SeasonAward[] {
  const awards: SeasonAward[] = [];

  const topRuns = [...stats].sort((a, b) => b.runs - a.runs)[0];
  if (topRuns) awards.push({ playerId: topRuns.player_id, playerName: playerMap.get(topRuns.player_id) ?? 'Unknown', category: 'Orange Cap', value: `${topRuns.runs} runs`, icon: '🏏' });

  const topWickets = [...stats].sort((a, b) => b.wickets - a.wickets)[0];
  if (topWickets) awards.push({ playerId: topWickets.player_id, playerName: playerMap.get(topWickets.player_id) ?? 'Unknown', category: 'Purple Cap', value: `${topWickets.wickets} wickets`, icon: '🎯' });

  const sortedByAvg = [...stats].filter(s => s.outs > 0).sort((a, b) => (b.runs / b.outs) - (a.runs / a.outs));
  if (sortedByAvg[0]) awards.push({ playerId: sortedByAvg[0].player_id, playerName: playerMap.get(sortedByAvg[0].player_id) ?? 'Unknown', category: 'MVP', value: `${(sortedByAvg[0].runs / sortedByAvg[0].outs).toFixed(1)} avg`, icon: '🏆' });

  const emerging = [...stats].filter(s => s.matches_played <= 5).sort((a, b) => b.runs - a.runs)[0];
  if (emerging) awards.push({ playerId: emerging.player_id, playerName: playerMap.get(emerging.player_id) ?? 'Unknown', category: 'Emerging Player', value: `${emerging.runs} runs`, icon: '⭐' });

  const topFielding = [...stats].sort((a, b) => (b.catches + b.run_outs + b.stumpings) - (a.catches + a.run_outs + a.stumpings))[0];
  if (topFielding) awards.push({ playerId: topFielding.player_id, playerName: playerMap.get(topFielding.player_id) ?? 'Unknown', category: 'Best Fielder', value: `${topFielding.catches + topFielding.run_outs + topFielding.stumpings} dismissals`, icon: '🧤' });

  return awards;
}

export interface HallOfFame {
  mostRuns: { playerName: string; value: number } | null;
  mostWickets: { playerName: string; value: number } | null;
  mostPotm: { playerName: string; value: number } | null;
  highestScore: { playerName: string; value: number } | null;
  bestBowling: { playerName: string; value: string } | null;
}

export function computeHallOfFame(
  stats: PlayerStatistics[],
  matches: Match[],
  playerMap: Map<string, string>
): HallOfFame {
  const mostRuns = [...stats].sort((a, b) => b.runs - a.runs)[0];
  const mostWickets = [...stats].sort((a, b) => b.wickets - a.wickets)[0];
  const highestScore = [...stats].sort((a, b) => b.highest_score - a.highest_score)[0];

  const potmCounts = matches
    .filter(m => m.player_of_match_id)
    .reduce<Record<string, number>>((acc, m) => {
      acc[m.player_of_match_id!] = (acc[m.player_of_match_id!] || 0) + 1;
      return acc;
    }, {});
  const mostPotm = Object.entries(potmCounts).sort(([, a], [, b]) => b - a)[0];

  return {
    mostRuns: mostRuns ? { playerName: playerMap.get(mostRuns.player_id) ?? 'Unknown', value: mostRuns.runs } : null,
    mostWickets: mostWickets ? { playerName: playerMap.get(mostWickets.player_id) ?? 'Unknown', value: mostWickets.wickets } : null,
    mostPotm: mostPotm ? { playerName: playerMap.get(mostPotm[0]) ?? 'Unknown', value: mostPotm[1] } : null,
    highestScore: highestScore ? { playerName: playerMap.get(highestScore.player_id) ?? 'Unknown', value: highestScore.highest_score } : null,
    bestBowling: null,
  };
}

export function computeWinProbability(
  targetRuns: number,
  currentRuns: number,
  wicketsLost: number,
  totalWickets: number,
  oversUsed: number,
  totalOvers: number
): number {
  if (targetRuns <= 0 || totalOvers <= 0) return 50;

  const runsNeeded = targetRuns - currentRuns;
  const ballsRemaining = (totalOvers * 6) - oversUsed;

  if (runsNeeded <= 0) return 100;
  if (ballsRemaining <= 0 || wicketsLost >= totalWickets) return 0;
  if (currentRuns <= 0) return 0;

  const crr = oversUsed > 0 ? currentRuns / (oversUsed / 6) : 0;
  const rrr = runsNeeded / (ballsRemaining / 6);

  const runFactor = rrr > 0 ? Math.max(0, Math.min(1, crr / rrr)) : 1;
  const wicketFactor = Math.max(0, 1 - (wicketsLost / totalWickets));
  const ballFactor = Math.min(1, ballsRemaining / (totalOvers * 6));

  const probability = (runFactor * 0.5 + wicketFactor * 0.3 + ballFactor * 0.2) * 100;
  return Math.round(Math.max(0, Math.min(100, probability)));
}

export function computeAttendanceRate(
  totalMatches: number,
  availableCount: number
): number {
  if (totalMatches === 0) return 0;
  return Math.round((availableCount / totalMatches) * 100);
}
