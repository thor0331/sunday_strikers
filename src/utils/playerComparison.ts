import type { BallEvent, Match, MatchPlayer } from '../types/models';
import { aggregateBatting, aggregateBowling } from './seasonStatistics';
import { buildPlayerDashboardData, type PlayerDashboardData, type PlayerStatsSource } from './playerDashboard';

export type HigherSide = 'a' | 'b' | 'tie' | 'none';

export interface ComparisonStat {
  label: string;
  valueA: string | number;
  valueB: string | number;
  numericA: number | null;
  numericB: number | null;
  higher: HigherSide;
  invert?: boolean;
}

export interface RadarPoint {
  subject: string;
  playerA: number;
  playerB: number;
}

export interface PlayerHeadToHead {
  matchesTogether: number;
  winsTogether: number;
  eitherPotm: number;
  highestPartnership: { runs: number; balls: number } | null;
}

export interface CareerLeaders {
  mostRuns: { playerId: string; runs: number } | null;
  mostWickets: { playerId: string; wickets: number } | null;
  mostPotm: { playerId: string; count: number } | null;
}

export interface ComparisonAchievement {
  id: string;
  label: string;
  a: boolean;
  b: boolean;
  detailA: string;
  detailB: string;
}

export interface PlayerComparisonData {
  stats: ComparisonStat[];
  radar: RadarPoint[];
  headToHead: PlayerHeadToHead | null;
  achievements: ComparisonAchievement[];
}

function compareNumeric(aNum: number | null, bNum: number | null, invert?: boolean): HigherSide {
  if (aNum == null && bNum == null) return 'none';
  if (aNum == null) return 'b';
  if (bNum == null) return 'a';
  if (aNum === bNum) return 'tie';
  if (invert) return aNum < bNum ? 'a' : 'b';
  return aNum > bNum ? 'a' : 'b';
}

function toStat(
  label: string,
  valueA: string | number,
  valueB: string | number,
  numericA: number | null,
  numericB: number | null,
  invert?: boolean
): ComparisonStat {
  return {
    label,
    valueA,
    valueB,
    numericA,
    numericB,
    higher: compareNumeric(numericA, numericB, invert),
    invert,
  };
}

export function computeComparisonStats(
  a: PlayerDashboardData,
  b: PlayerDashboardData,
  recentA: number,
  recentB: number
): ComparisonStat[] {
  const bestA = a.bowling && a.bowling.bestBowlingWickets > 0 ? `${a.bowling.bestBowlingWickets}/${a.bowling.bestBowlingRuns}` : '—';
  const bestB = b.bowling && b.bowling.bestBowlingWickets > 0 ? `${b.bowling.bestBowlingWickets}/${b.bowling.bestBowlingRuns}` : '—';
  const bestNumA = a.bowling && a.bowling.bestBowlingWickets > 0 ? a.bowling.bestBowlingWickets * 100 - a.bowling.bestBowlingRuns : null;
  const bestNumB = b.bowling && b.bowling.bestBowlingWickets > 0 ? b.bowling.bestBowlingWickets * 100 - b.bowling.bestBowlingRuns : null;

  return [
    toStat('Matches', a.matchesPlayed, b.matchesPlayed, a.matchesPlayed, b.matchesPlayed),
    toStat('Runs', a.batting?.runs ?? 0, b.batting?.runs ?? 0, a.batting?.runs ?? 0, b.batting?.runs ?? 0),
    toStat('Average', a.batting?.average ?? 0, b.batting?.average ?? 0, a.batting?.average ?? 0, b.batting?.average ?? 0),
    toStat('Strike Rate', a.batting?.strikeRate ?? 0, b.batting?.strikeRate ?? 0, a.batting?.strikeRate ?? 0, b.batting?.strikeRate ?? 0),
    toStat('Highest', a.batting?.highestScore ?? 0, b.batting?.highestScore ?? 0, a.batting?.highestScore ?? 0, b.batting?.highestScore ?? 0),
    toStat('Fours', a.batting?.fours ?? 0, b.batting?.fours ?? 0, a.batting?.fours ?? 0, b.batting?.fours ?? 0),
    toStat('Sixes', a.batting?.sixes ?? 0, b.batting?.sixes ?? 0, a.batting?.sixes ?? 0, b.batting?.sixes ?? 0),
    toStat('Wickets', a.bowling?.wickets ?? 0, b.bowling?.wickets ?? 0, a.bowling?.wickets ?? 0, b.bowling?.wickets ?? 0),
    toStat('Economy', a.bowling?.economy ?? 0, b.bowling?.economy ?? 0, a.bowling?.economy ?? 0, b.bowling?.economy ?? 0, true),
    toStat('Best Bowling', bestA, bestB, bestNumA, bestNumB),
    toStat('POTM', a.potmCount, b.potmCount, a.potmCount, b.potmCount),
    toStat('Catches', a.fielding?.catches ?? 0, b.fielding?.catches ?? 0, a.fielding?.catches ?? 0, b.fielding?.catches ?? 0),
    toStat('Availability', `${a.availabilityPct}%`, `${b.availabilityPct}%`, a.availabilityPct, b.availabilityPct),
    toStat('Win %', `${a.winPct}%`, `${b.winPct}%`, a.winPct, b.winPct),
    toStat('Recent Form', recentA, recentB, recentA, recentB),
  ];
}

export function computeRecentFormRuns(playerId: string, events: BallEvent[], matches: Match[]): number {
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const byInnings = new Map<string, { runs: number; balls: number; isOut: boolean; matchId: string }>();
  for (const event of events) {
    if (event.strikerId !== playerId) continue;
    const entry = byInnings.get(event.inningsId) ?? { runs: 0, balls: 0, isOut: false, matchId: event.matchId };
    entry.runs += event.runsBatter;
    if (event.isLegalDelivery) entry.balls += 1;
    if (event.dismissedPlayerId === playerId) entry.isOut = true;
    byInnings.set(event.inningsId, entry);
  }
  return [...byInnings.values()]
    .map((entry) => ({ ...entry, date: matchById.get(entry.matchId)?.match_date ?? '' }))
    .sort((x, y) => y.date.localeCompare(x.date))
    .slice(0, 5)
    .reduce((sum, entry) => sum + entry.runs, 0);
}

function bestPartnershipInInnings(
  playerA: string,
  playerB: string,
  events: BallEvent[]
): { runs: number; balls: number } | null {
  const ordered = [...events].sort((x, y) => x.sequenceNumber - y.sequenceNumber);
  if (ordered.length === 0) return null;

  let striker = ordered[0].strikerId;
  let nonStriker = ordered[0].nonStrikerId;
  let runs = 0;
  let balls = 0;
  let best = { runs: 0, balls: 0 };

  const isPair = () =>
    (striker === playerA && nonStriker === playerB) || (striker === playerB && nonStriker === playerA);

  const record = () => {
    if (isPair() && runs > best.runs) best = { runs, balls };
  };

  for (const event of ordered) {
    if (event.strikerId !== striker && event.strikerId !== nonStriker) striker = event.strikerId;
    if (event.nonStrikerId !== striker && event.nonStrikerId !== nonStriker) nonStriker = event.nonStrikerId;

    const isLegal = event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball';
    if (event.extraType !== 'bye' && event.extraType !== 'leg_bye') balls += isLegal ? 1 : 0;
    runs += event.runsBatter + event.runsExtra;

    if (event.isWicket) {
      record();
      runs = 0;
      balls = 0;
    }

    const oddRotation =
      event.extraType === 'bye' || event.extraType === 'leg_bye'
        ? event.runsExtra % 2 === 1
        : event.runsBatter % 2 === 1;
    if (oddRotation) [striker, nonStriker] = [nonStriker, striker];
  }
  record();

  return best.runs > 0 ? best : null;
}

export function computePairPartnership(
  playerA: string,
  playerB: string,
  events: BallEvent[]
): { runs: number; balls: number } | null {
  const byInnings = new Map<string, BallEvent[]>();
  for (const event of events) {
    const list = byInnings.get(event.inningsId) ?? [];
    list.push(event);
    byInnings.set(event.inningsId, list);
  }

  let bestRuns = 0;
  let bestBalls = 0;
  for (const list of byInnings.values()) {
    const best = bestPartnershipInInnings(playerA, playerB, list);
    if (best && best.runs > bestRuns) {
      bestRuns = best.runs;
      bestBalls = best.balls;
    }
  }
  if (bestRuns === 0) return null;
  return { runs: bestRuns, balls: bestBalls };
}

export function computeHeadToHeadPlayers(
  playerA: string,
  playerB: string,
  matches: Match[],
  matchPlayers: MatchPlayer[],
  events: BallEvent[]
): PlayerHeadToHead | null {
  const together = matches.filter((m) => {
    const inMatch = matchPlayers.filter((mp) => mp.match_id === m.id && (mp.player_id === playerA || mp.player_id === playerB));
    return inMatch.some((mp) => mp.player_id === playerA) && inMatch.some((mp) => mp.player_id === playerB);
  });

  let winsTogether = 0;
  let eitherPotm = 0;
  for (const m of together) {
    const mpA = matchPlayers.find((mp) => mp.match_id === m.id && mp.player_id === playerA);
    const mpB = matchPlayers.find((mp) => mp.match_id === m.id && mp.player_id === playerB);
    if (mpA && mpB && mpA.team === mpB.team && m.winner === mpA.team) winsTogether += 1;
    if (m.player_of_match_id === playerA || m.player_of_match_id === playerB) eitherPotm += 1;
  }

  if (together.length === 0) return null;
  return {
    matchesTogether: together.length,
    winsTogether,
    eitherPotm,
    highestPartnership: computePairPartnership(playerA, playerB, events),
  };
}

export function computeCareerLeaders(matches: Match[], events: BallEvent[]): CareerLeaders {
  const batting = aggregateBatting(events);
  const bowling = aggregateBowling(events);

  const mostRuns = batting.length > 0 && batting[0].runs > 0 ? { playerId: batting[0].playerId, runs: batting[0].runs } : null;
  const mostWickets = bowling.length > 0 && bowling[0].wickets > 0 ? { playerId: bowling[0].playerId, wickets: bowling[0].wickets } : null;

  const potmCounts = new Map<string, number>();
  for (const m of matches) {
    if (m.player_of_match_id) potmCounts.set(m.player_of_match_id, (potmCounts.get(m.player_of_match_id) ?? 0) + 1);
  }
  const sorted = [...potmCounts.entries()].sort(([, x], [, y]) => y - x);
  const mostPotm = sorted.length > 0 && sorted[0][1] > 0 ? { playerId: sorted[0][0], count: sorted[0][1] } : null;

  return { mostRuns, mostWickets, mostPotm };
}

export function computeChampionships(playerId: string, matches: Match[], matchPlayers: MatchPlayer[]): string[] {
  const bySeason = new Map<string, Match[]>();
  for (const m of matches) {
    if (!m.season_id) continue;
    const list = bySeason.get(m.season_id) ?? [];
    list.push(m);
    bySeason.set(m.season_id, list);
  }

  const won: string[] = [];
  for (const seasonMatches of bySeason.values()) {
    const sorted = [...seasonMatches].sort((a, b) => b.match_date.localeCompare(a.match_date));
    const finalMatch = sorted[0];
    if (!finalMatch?.winner) continue;
    const mp = matchPlayers.find((x) => x.match_id === finalMatch.id && x.player_id === playerId);
    if (mp && mp.team === finalMatch.winner) won.push(finalMatch.match_name);
  }
  return won;
}

export function computeAchievements(
  a: PlayerDashboardData,
  b: PlayerDashboardData,
  champA: string[],
  champB: string[],
  leaders: CareerLeaders
): ComparisonAchievement[] {
  const isLeader = (playerId: string, leaderId: string | null | undefined) => Boolean(leaderId) && leaderId === playerId;

  const runsA = a.batting?.runs ?? 0;
  const runsB = b.batting?.runs ?? 0;
  const wktsA = a.bowling?.wickets ?? 0;
  const wktsB = b.bowling?.wickets ?? 0;

  return [
    {
      id: 'orange-cap',
      label: 'Orange Cap',
      a: isLeader(a.playerId, leaders.mostRuns?.playerId),
      b: isLeader(b.playerId, leaders.mostRuns?.playerId),
      detailA: `${runsA} runs`,
      detailB: `${runsB} runs`,
    },
    {
      id: 'purple-cap',
      label: 'Purple Cap',
      a: isLeader(a.playerId, leaders.mostWickets?.playerId),
      b: isLeader(b.playerId, leaders.mostWickets?.playerId),
      detailA: `${wktsA} wickets`,
      detailB: `${wktsB} wickets`,
    },
    {
      id: 'potm-leader',
      label: 'POTM Leader',
      a: isLeader(a.playerId, leaders.mostPotm?.playerId),
      b: isLeader(b.playerId, leaders.mostPotm?.playerId),
      detailA: `${a.potmCount} awards`,
      detailB: `${b.potmCount} awards`,
    },
    {
      id: 'championship',
      label: 'Championships',
      a: champA.length > 0,
      b: champB.length > 0,
      detailA: champA.length > 0 ? champA.join(', ') : 'No titles',
      detailB: champB.length > 0 ? champB.join(', ') : 'No titles',
    },
    {
      id: 'career-runs',
      label: 'Career Runs (500+)',
      a: runsA >= 500,
      b: runsB >= 500,
      detailA: `${runsA} runs`,
      detailB: `${runsB} runs`,
    },
    {
      id: 'career-wickets',
      label: 'Career Wickets (25+)',
      a: wktsA >= 25,
      b: wktsB >= 25,
      detailA: `${wktsA} wickets`,
      detailB: `${wktsB} wickets`,
    },
  ];
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeRadarScores(a: PlayerDashboardData, b: PlayerDashboardData, totalMatches: number): RadarPoint[] {
  const build = (d: PlayerDashboardData) => {
    const matches = Math.max(d.matchesPlayed, 1);
    const runsPerMatch = (d.batting?.runs ?? 0) / matches;
    const wicketsPerMatch = (d.bowling?.wickets ?? 0) / matches;
    const avg = d.batting?.average ?? 0;
    const sr = d.batting?.strikeRate ?? 0;
    const eco = d.bowling?.economy ?? 0;
    const dotPct = d.bowling && d.bowling.ballsBowled > 0 ? (d.bowling.dotBalls / d.bowling.ballsBowled) * 100 : 0;
    const dismissals = (d.fielding?.catches ?? 0) + (d.fielding?.runOuts ?? 0) + (d.fielding?.stumpings ?? 0);
    const notOutPct = d.batting && d.batting.innings > 0 ? (d.batting.notOuts / d.batting.innings) * 100 : 0;
    const participation = totalMatches > 0 ? (d.matchesPlayed / totalMatches) * 100 : 0;

    return {
      Batting: clampScore(runsPerMatch * 6 + Math.min(sr, 150) * 0.2 + Math.min(avg, 50) * 0.6),
      Bowling: clampScore(wicketsPerMatch * 30 + Math.min(dotPct, 40) + (eco > 0 && eco < 12 ? (12 - eco) * 4 : 0)),
      Fielding: clampScore(dismissals * 20),
      Consistency: clampScore(participation * 0.4 + notOutPct * 0.4 + d.winPct * 0.2),
      'Match Impact': clampScore(d.potmCount * 15 + d.winPct * 0.3 + (runsPerMatch + wicketsPerMatch * 8) * 1.5),
      Availability: clampScore(d.availabilityPct),
    };
  };

  const sA = build(a);
  const sB = build(b);
  return (['Batting', 'Bowling', 'Fielding', 'Consistency', 'Match Impact', 'Availability'] as const).map((subject) => ({
    subject,
    playerA: sA[subject],
    playerB: sB[subject],
  }));
}

export function computeComparisonData(playerA: string, playerB: string, source: PlayerStatsSource): PlayerComparisonData {
  const dataA = buildPlayerDashboardData(playerA, source);
  const dataB = buildPlayerDashboardData(playerB, source);
  const recentA = computeRecentFormRuns(playerA, source.events, source.matches);
  const recentB = computeRecentFormRuns(playerB, source.events, source.matches);

  const stats = computeComparisonStats(dataA, dataB, recentA, recentB);
  const radar = computeRadarScores(dataA, dataB, source.matches.length);
  const headToHead = computeHeadToHeadPlayers(playerA, playerB, source.matches, source.matchPlayers, source.events);
  const leaders = computeCareerLeaders(source.matches, source.events);
  const champA = computeChampionships(playerA, source.matches, source.matchPlayers);
  const champB = computeChampionships(playerB, source.matches, source.matchPlayers);
  const achievements = computeAchievements(dataA, dataB, champA, champB, leaders);

  return { stats, radar, headToHead, achievements };
}
