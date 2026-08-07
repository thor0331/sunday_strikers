import { describe, expect, it } from 'vitest';
import type { BallEvent, Match, MatchPlayer } from '../types/models';
import { buildPlayerDashboardData, type PlayerStatsSource } from './playerDashboard';
import {
  computeAchievements,
  computeCareerLeaders,
  computeChampionships,
  computeComparisonStats,
  computeHeadToHeadPlayers,
  computePairPartnership,
  computeRadarScores,
  computeRecentFormRuns,
} from './playerComparison';

let seq = 0;
function ball(partial: Partial<BallEvent>): BallEvent {
  seq += 1;
  return {
    id: `b-${seq}`,
    matchId: partial.matchId ?? 'm1',
    inningsId: partial.inningsId ?? 'inn-1',
    sequenceNumber: partial.sequenceNumber ?? seq,
    overNumber: partial.overNumber ?? 0,
    ballInOver: partial.ballInOver ?? 0,
    strikerId: partial.strikerId ?? 'p1',
    nonStrikerId: partial.nonStrikerId ?? 'p2',
    bowlerId: partial.bowlerId ?? 'bowl1',
    runsBatter: partial.runsBatter ?? 0,
    runsExtra: partial.runsExtra ?? 0,
    extraType: partial.extraType ?? null,
    isWicket: partial.isWicket ?? false,
    wicketType: partial.wicketType ?? null,
    dismissedPlayerId: partial.dismissedPlayerId ?? null,
    incomingBatsmanId: partial.incomingBatsmanId ?? null,
    fielderId: partial.fielderId ?? null,
    isLegalDelivery: partial.isLegalDelivery ?? true,
    notes: partial.notes ?? null,
    createdBy: null,
    createdAt: '2026-06-08T00:00:00.000Z',
  };
}

function match(partial: Partial<Match>): Match {
  return {
    id: partial.id ?? 'm1',
    parent_match_id: null,
    season_id: partial.season_id ?? null,
    match_name: partial.match_name ?? 'Match 1',
    match_date: partial.match_date ?? '2026-01-01',
    match_number: null,
    venue: null,
    is_super_over: false,
    overs_per_innings: 10,
    players_per_team: 11,
    status: partial.status ?? 'completed',
    team_a_name: partial.team_a_name ?? 'Team A',
    team_b_name: partial.team_b_name ?? 'Team B',
    team_a_captain_id: null,
    team_b_captain_id: null,
    toss_winner: null,
    toss_decision: null,
    batting_first: null,
    winner: partial.winner ?? null,
    player_of_match_id: partial.player_of_match_id ?? null,
    result_text: partial.result_text ?? null,
    notes: null,
    match_format: null,
  };
}

function matchPlayer(partial: Partial<MatchPlayer>): MatchPlayer {
  return {
    id: partial.id ?? `mp-${partial.match_id}-${partial.player_id}`,
    match_id: partial.match_id ?? 'm1',
    player_id: partial.player_id ?? 'p1',
    team: partial.team ?? 'team_a',
    batting_order: partial.batting_order ?? null,
    is_captain: partial.is_captain ?? false,
    created_at: partial.created_at ?? '2026-01-01T00:00:00Z',
  };
}

function source(partial: Partial<PlayerStatsSource>): PlayerStatsSource {
  return {
    matches: partial.matches ?? [],
    events: partial.events ?? [],
    matchPlayers: partial.matchPlayers ?? [],
    allAvailability: partial.allAvailability ?? [],
  };
}

function dashboard(playerId: string, s: Partial<PlayerStatsSource>) {
  return buildPlayerDashboardData(playerId, source(s));
}

describe('computeComparisonStats', () => {
  const a = dashboard('p1', {
    matches: [match({ id: 'm1', winner: 'team_a' })],
    matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' })],
    events: [ball({ strikerId: 'p1', runsBatter: 4 }), ball({ strikerId: 'p1', runsBatter: 4 })],
  });
  const b = dashboard('p2', {
    matches: [match({ id: 'm1', winner: 'team_a' })],
    matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p2', team: 'team_a' })],
    events: [ball({ strikerId: 'p2', runsBatter: 1 })],
  });

  const stats = computeComparisonStats(a, b, 10, 20);

  it('flags the player with the higher numeric value', () => {
    expect(stats.find((s) => s.label === 'Runs')?.higher).toBe('a');
    expect(stats.find((s) => s.label === 'Matches')?.higher).toBe('tie');
    expect(stats.find((s) => s.label === 'Recent Form')?.higher).toBe('b');
  });

  it('inverts economy so a lower value wins', () => {
    const aBowling = dashboard('p1', {
      matches: [match({ id: 'm1', winner: 'team_a' })],
      matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' })],
      events: [ball({ bowlerId: 'p1', runsBatter: 1, runsExtra: 0 }), ball({ bowlerId: 'p1', runsBatter: 1, runsExtra: 0 })],
    });
    const bBowling = dashboard('p2', {
      matches: [match({ id: 'm1', winner: 'team_a' })],
      matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p2', team: 'team_a' })],
      events: [ball({ bowlerId: 'p2', runsBatter: 6, runsExtra: 0 })],
    });
    const economy = computeComparisonStats(aBowling, bBowling, 0, 0).find((s) => s.label === 'Economy');
    expect(economy?.higher).toBe('a');
    expect(economy?.invert).toBe(true);
  });

  it('renders best bowling as wickets/runs only when wickets were taken', () => {
    const bowling = computeComparisonStats(a, b, 0, 0).find((s) => s.label === 'Best Bowling');
    expect(bowling?.valueA).toBe('—');
  });
});

describe('computeRecentFormRuns', () => {
  it('sums runs from the most recent 5 innings', () => {
    const events = [
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm3', inningsId: 'inn-3', strikerId: 'p1', runsBatter: 1 }),
    ];
    const matches = [
      match({ id: 'm1', match_date: '2026-01-01' }),
      match({ id: 'm2', match_date: '2026-01-02' }),
      match({ id: 'm3', match_date: '2026-01-03' }),
    ];
    expect(computeRecentFormRuns('p1', events, matches)).toBe(19);
  });
});

describe('computePairPartnership', () => {
  it('returns the highest partnership between the exact pair only', () => {
    const events = [
      ball({ inningsId: 'inn-1', sequenceNumber: 1, strikerId: 'p1', nonStrikerId: 'p2', runsBatter: 1 }),
      ball({ inningsId: 'inn-1', sequenceNumber: 2, strikerId: 'p2', nonStrikerId: 'p1', runsBatter: 4 }),
      ball({ inningsId: 'inn-1', sequenceNumber: 3, strikerId: 'p2', nonStrikerId: 'p1', runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p2' }),
      ball({ inningsId: 'inn-1', sequenceNumber: 4, strikerId: 'p3', nonStrikerId: 'p1', runsBatter: 6 }),
    ];
    const partnership = computePairPartnership('p1', 'p2', events);
    expect(partnership).toEqual({ runs: 5, balls: 3 });
  });

  it('returns null when the pair never bats together', () => {
    const events = [
      ball({ inningsId: 'inn-1', sequenceNumber: 1, strikerId: 'p1', nonStrikerId: 'p3', runsBatter: 4 }),
    ];
    expect(computePairPartnership('p1', 'p2', events)).toBeNull();
  });
});

describe('computeHeadToHeadPlayers', () => {
  it('computes matches together, same-team wins and POTM shared', () => {
    const matches = [
      match({ id: 'm1', winner: 'team_a', player_of_match_id: 'p1' }),
      match({ id: 'm2', winner: 'team_a', player_of_match_id: 'p2' }),
    ];
    const matchPlayers = [
      matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' }),
      matchPlayer({ match_id: 'm1', player_id: 'p2', team: 'team_b' }),
      matchPlayer({ match_id: 'm2', player_id: 'p1', team: 'team_a' }),
      matchPlayer({ match_id: 'm2', player_id: 'p2', team: 'team_a' }),
    ];
    const h2h = computeHeadToHeadPlayers('p1', 'p2', matches, matchPlayers, []);
    expect(h2h).toEqual({ matchesTogether: 2, winsTogether: 1, eitherPotm: 2, highestPartnership: null });
  });

  it('returns null when the players never play in the same match', () => {
    const matches = [match({ id: 'm1', winner: 'team_a' })];
    const matchPlayers = [matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' })];
    expect(computeHeadToHeadPlayers('p1', 'p2', matches, matchPlayers, [])).toBeNull();
  });
});

describe('computeCareerLeaders', () => {
  it('identifies the run, wicket and POTM leaders', () => {
    const matches = [
      match({ id: 'm1', player_of_match_id: 'p1' }),
      match({ id: 'm2', player_of_match_id: 'p1' }),
    ];
    const events = [
      ball({ matchId: 'm1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm1', bowlerId: 'p2', runsBatter: 0, runsExtra: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p3' }),
    ];
    const leaders = computeCareerLeaders(matches, events);
    expect(leaders.mostRuns).toEqual({ playerId: 'p1', runs: 24 });
    expect(leaders.mostWickets?.playerId).toBe('p2');
    expect(leaders.mostPotm).toEqual({ playerId: 'p1', count: 2 });
  });
});

describe('computeChampionships', () => {
  it('counts seasons where the player won the season final', () => {
    const matches = [
      match({ id: 'm1', season_id: 's1', match_name: 'Final 1', match_date: '2026-06-10', winner: 'team_a' }),
      match({ id: 'm2', season_id: 's1', match_name: 'Round 1', match_date: '2026-06-01', winner: 'team_b' }),
      match({ id: 'm3', season_id: 's2', match_name: 'Final 2', match_date: '2026-06-20', winner: null }),
    ];
    const matchPlayers = [
      matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' }),
      matchPlayer({ match_id: 'm1', player_id: 'p2', team: 'team_b' }),
      matchPlayer({ match_id: 'm2', player_id: 'p1', team: 'team_b' }),
    ];
    expect(computeChampionships('p1', matches, matchPlayers)).toEqual(['Final 1']);
    expect(computeChampionships('p2', matches, matchPlayers)).toEqual([]);
  });
});

describe('computeAchievements', () => {
  const a = dashboard('p1', {
    matches: [match({ id: 'm1', winner: 'team_a' })],
    matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' })],
    events: [ball({ strikerId: 'p1', runsBatter: 4 }), ball({ strikerId: 'p1', runsBatter: 6 })],
  });
  const b = dashboard('p2', { matches: [], events: [] });

  it('marks the leader and milestone holders', () => {
    const achievements = computeAchievements(a, b, ['Final 1'], [], {
      mostRuns: { playerId: 'p1', runs: 10 },
      mostWickets: null,
      mostPotm: { playerId: 'p1', count: 1 },
    });
    const orange = achievements.find((x) => x.id === 'orange-cap');
    expect(orange?.a).toBe(true);
    expect(orange?.b).toBe(false);
    const championship = achievements.find((x) => x.id === 'championship');
    expect(championship?.a).toBe(true);
    expect(championship?.b).toBe(false);
  });
});

describe('computeRadarScores', () => {
  it('builds radar points for every subject and clamps to 0-100', () => {
    const a = dashboard('p1', {
      matches: [match({ id: 'm1', winner: 'team_a' })],
      matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' })],
      events: [ball({ strikerId: 'p1', runsBatter: 4 }), ball({ strikerId: 'p1', runsBatter: 4 })],
    });
    const b = dashboard('p2', { matches: [], events: [] });

    const points = computeRadarScores(a, b, 1);
    expect(points).toHaveLength(6);
    expect(points.map((p) => p.subject)).toEqual(['Batting', 'Bowling', 'Fielding', 'Consistency', 'Match Impact', 'Availability']);
    for (const p of points) {
      expect(p.playerA).toBeGreaterThanOrEqual(0);
      expect(p.playerA).toBeLessThanOrEqual(100);
      expect(p.playerB).toBeGreaterThanOrEqual(0);
      expect(p.playerB).toBeLessThanOrEqual(100);
    }
    expect(points.find((p) => p.subject === 'Availability')).toEqual({ subject: 'Availability', playerA: 0, playerB: 0 });
  });
});
