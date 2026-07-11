import type { PlayerStatistics, Match, Player } from '../types/models';

export interface HallOfFameRecord {
  playerId: string;
  playerName: string;
  playerPhoto: string | null;
  value: number | string;
  subtitle: string;
}

type PlayerMap = Map<string, string>;
type PhotoMap = Map<string, string | null>;

function topRecord(records: HallOfFameRecord[]): HallOfFameRecord | null {
  return records.length > 0 ? records[0] : null;
}

function aggregateStats(stats: PlayerStatistics[]): Map<string, PlayerStatistics> {
  const map = new Map<string, PlayerStatistics>();
  for (const s of stats) {
    const existing = map.get(s.player_id);
    if (!existing) {
      map.set(s.player_id, { ...s });
    } else {
      existing.matches_played += s.matches_played;
      existing.batting_innings += s.batting_innings;
      existing.runs += s.runs;
      existing.balls_faced += s.balls_faced;
      existing.fours += s.fours;
      existing.sixes += s.sixes;
      existing.outs += s.outs;
      existing.highest_score = Math.max(existing.highest_score, s.highest_score);
      existing.bowling_innings += s.bowling_innings;
      existing.balls_bowled += s.balls_bowled;
      existing.runs_conceded += s.runs_conceded;
      existing.wickets += s.wickets;
      existing.maidens += s.maidens;
      existing.catches += s.catches;
      existing.run_outs += s.run_outs;
      existing.stumpings += s.stumpings;
    }
  }
  return map;
}

export function computeMostRuns(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const agg = aggregateStats(stats);
  const sorted = [...agg.values()].sort((a, b) => b.runs - a.runs);
  const top = sorted[0];
  if (!top || top.runs === 0) return null;
  const avg = top.outs > 0 ? (top.runs / top.outs).toFixed(1) : '-';
  return { playerId: top.player_id, playerName: playerMap.get(top.player_id) ?? 'Unknown', playerPhoto: photoMap.get(top.player_id) ?? null, value: top.runs, subtitle: `Avg: ${avg} • ${top.matches_played} matches` };
}

export function computeMostWickets(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const agg = aggregateStats(stats);
  const sorted = [...agg.values()].sort((a, b) => b.wickets - a.wickets);
  const top = sorted[0];
  if (!top || top.wickets === 0) return null;
  const eco = top.balls_bowled > 0 ? ((top.runs_conceded * 6) / top.balls_bowled).toFixed(1) : '-';
  return { playerId: top.player_id, playerName: playerMap.get(top.player_id) ?? 'Unknown', playerPhoto: photoMap.get(top.player_id) ?? null, value: top.wickets, subtitle: `Eco: ${eco} • ${top.matches_played} matches` };
}

export function computeMostPotm(matches: Match[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const counts = new Map<string, number>();
  for (const m of matches) {
    if (m.player_of_match_id) counts.set(m.player_of_match_id, (counts.get(m.player_of_match_id) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort(([, a], [, b]) => b - a);
  const top = sorted[0];
  if (!top) return null;
  return { playerId: top[0], playerName: playerMap.get(top[0]) ?? 'Unknown', playerPhoto: photoMap.get(top[0]) ?? null, value: top[1], subtitle: 'Player of the Match awards' };
}

export function computeMostMatchesPlayed(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const agg = aggregateStats(stats);
  const sorted = [...agg.values()].sort((a, b) => b.matches_played - a.matches_played);
  const top = sorted[0];
  if (!top || top.matches_played === 0) return null;
  return { playerId: top.player_id, playerName: playerMap.get(top.player_id) ?? 'Unknown', playerPhoto: photoMap.get(top.player_id) ?? null, value: top.matches_played, subtitle: `${top.runs} runs • ${top.wickets} wickets` };
}

export function computeHighestScore(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const sorted = [...stats].sort((a, b) => b.highest_score - a.highest_score);
  const top = sorted[0];
  if (!top || top.highest_score === 0) return null;
  return { playerId: top.player_id, playerName: playerMap.get(top.player_id) ?? 'Unknown', playerPhoto: photoMap.get(top.player_id) ?? null, value: top.highest_score, subtitle: `${top.fours} fours • ${top.sixes} sixes` };
}

export function computeBestBowlingFromStats(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const sorted = [...stats].sort((a, b) => {
    if (b.wickets !== a.wickets) return b.wickets - a.wickets;
    return a.runs_conceded - b.runs_conceded;
  });
  const top = sorted[0];
  if (!top || top.wickets === 0) return null;
  return { playerId: top.player_id, playerName: playerMap.get(top.player_id) ?? 'Unknown', playerPhoto: photoMap.get(top.player_id) ?? null, value: `${top.wickets}/${top.runs_conceded}`, subtitle: `${top.matches_played} matches • Career best` };
}

export function computeMostSixes(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const agg = aggregateStats(stats);
  const sorted = [...agg.values()].sort((a, b) => b.sixes - a.sixes);
  const top = sorted[0];
  if (!top || top.sixes === 0) return null;
  return { playerId: top.player_id, playerName: playerMap.get(top.player_id) ?? 'Unknown', playerPhoto: photoMap.get(top.player_id) ?? null, value: top.sixes, subtitle: `${top.runs} total runs • ${top.matches_played} matches` };
}

export function computeHighestStrikeRate(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap, minInnings: number = 3): HallOfFameRecord | null {
  const agg = aggregateStats(stats);
  const eligible = [...agg.values()].filter((s) => s.batting_innings >= minInnings);
  const sorted = eligible.sort((a, b) => (b.runs / b.balls_faced) - (a.runs / a.balls_faced));
  const top = sorted[0];
  if (!top || top.balls_faced === 0) return null;
  const sr = ((top.runs / top.balls_faced) * 100).toFixed(1);
  return { playerId: top.player_id, playerName: playerMap.get(top.player_id) ?? 'Unknown', playerPhoto: photoMap.get(top.player_id) ?? null, value: `${sr}%`, subtitle: `${top.runs} runs off ${top.balls_faced} balls • Min ${minInnings} innings` };
}

export function computeBestEconomy(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap, minOvers: number = 6): HallOfFameRecord | null {
  const agg = aggregateStats(stats);
  const minBalls = minOvers * 6;
  const eligible = [...agg.values()].filter((s) => s.balls_bowled >= minBalls);
  const sorted = eligible.sort((a, b) => {
    const ecoA = a.balls_bowled > 0 ? (a.runs_conceded * 6) / a.balls_bowled : Infinity;
    const ecoB = b.balls_bowled > 0 ? (b.runs_conceded * 6) / b.balls_bowled : Infinity;
    return ecoA - ecoB;
  });
  const top = sorted[0];
  if (!top || top.balls_bowled === 0) return null;
  const eco = ((top.runs_conceded * 6) / top.balls_bowled).toFixed(1);
  return { playerId: top.player_id, playerName: playerMap.get(top.player_id) ?? 'Unknown', playerPhoto: photoMap.get(top.player_id) ?? null, value: eco, subtitle: `${top.wickets} wickets in ${top.balls_bowled} balls • Min ${minOvers} overs` };
}

export function computeMostWinsAsCaptain(matches: Match[], players: Player[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const completed = matches.filter((m) => m.status === 'completed');
  const captainWins = new Map<string, number>();
  for (const m of completed) {
    const captainId = m.winner === 'team_a' ? m.team_a_captain_id : m.winner === 'team_b' ? m.team_b_captain_id : null;
    if (captainId && m.winner) captainWins.set(captainId, (captainWins.get(captainId) ?? 0) + 1);
  }
  const sorted = [...captainWins.entries()].sort(([, a], [, b]) => b - a);
  const top = sorted[0];
  if (!top) return null;
  const totalCaptain = completed.filter((m) => m.team_a_captain_id === top[0] || m.team_b_captain_id === top[0]).length;
  return { playerId: top[0], playerName: playerMap.get(top[0]) ?? 'Unknown', playerPhoto: photoMap.get(top[0]) ?? null, value: top[1], subtitle: `${top[1]} wins in ${totalCaptain} matches as captain` };
}

export function computeHighestPartnership(matches: Match[], ballEvents: { matchId: string; strikerId: string; nonStrikerId: string; runsBatter: number; runsExtra: number; isLegalDelivery: boolean }[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const completed = matches.filter((m) => m.status === 'completed');
  const partnershipByMatch = new Map<string, { runs: number; b1: string; b2: string }>();

  for (const ev of ballEvents) {
    const key = ev.matchId;
    const pair = [ev.strikerId, ev.nonStrikerId].sort().join(':');
    const matchKey = `${key}:${pair}`;
    const existing = partnershipByMatch.get(matchKey) ?? { runs: 0, b1: ev.strikerId, b2: ev.nonStrikerId };
    existing.runs += ev.runsBatter + ev.runsExtra;
    partnershipByMatch.set(matchKey, existing);
  }

  let best = { runs: 0, b1: '', b2: '', matchName: '' };
  for (const [key, p] of partnershipByMatch) {
    if (p.runs > best.runs) {
      const matchId = key.split(':')[0];
      const match = completed.find((m) => m.id === matchId);
      best = { runs: p.runs, b1: p.b1, b2: p.b2, matchName: match?.match_name ?? '' };
    }
  }

  if (best.runs === 0) return null;
  const name1 = playerMap.get(best.b1) ?? 'Unknown';
  const name2 = playerMap.get(best.b2) ?? 'Unknown';
  return { playerId: best.b1, playerName: `${name1} & ${name2}`, playerPhoto: photoMap.get(best.b1) ?? null, value: best.runs, subtitle: `Partnership in ${best.matchName}` };
}

export function computeLongestWinningStreak(matches: Match[], players: Player[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const completed = matches.filter((m) => m.status === 'completed' && m.winner).sort((a, b) => a.match_date.localeCompare(b.match_date));
  const captains = new Set(players.filter((p) => p.status === 'active').map((p) => p.id));

  let bestStreak = { playerId: '', count: 0 };
  for (const captainId of captains) {
    let streak = 0;
    for (const m of completed) {
      const isCaptain = m.team_a_captain_id === captainId || m.team_b_captain_id === captainId;
      if (!isCaptain) continue;
      const won = (m.winner === 'team_a' && m.team_a_captain_id === captainId) || (m.winner === 'team_b' && m.team_b_captain_id === captainId);
      if (won) streak++;
      else streak = 0;
      if (streak > bestStreak.count) bestStreak = { playerId: captainId, count: streak };
    }
  }

  if (bestStreak.count < 2) return null;
  return { playerId: bestStreak.playerId, playerName: playerMap.get(bestStreak.playerId) ?? 'Unknown', playerPhoto: photoMap.get(bestStreak.playerId) ?? null, value: bestStreak.count, subtitle: `Consecutive wins as captain` };
}

export function computeMostSeasonsPlayed(stats: PlayerStatistics[], playerMap: PlayerMap, photoMap: PhotoMap): HallOfFameRecord | null {
  const seasonCount = new Map<string, Set<string>>();
  for (const s of stats) {
    if (!s.season_id) continue;
    const set = seasonCount.get(s.player_id) ?? new Set();
    set.add(s.season_id);
    seasonCount.set(s.player_id, set);
  }
  const sorted = [...seasonCount.entries()].sort(([, a], [, b]) => b.size - a.size);
  const top = sorted[0];
  if (!top || top[1].size < 2) return null;
  return { playerId: top[0], playerName: playerMap.get(top[0]) ?? 'Unknown', playerPhoto: photoMap.get(top[0]) ?? null, value: top[1].size, subtitle: `Seasons participated` };
}
