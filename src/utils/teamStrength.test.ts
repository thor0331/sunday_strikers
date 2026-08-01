import { describe, expect, it } from 'vitest';
import type { Availability, BallEvent, Match, MatchPlayer } from '../types/models';
import { computeTeamStrengths } from './teamStrength';

let seq = 0;

function match(partial: Partial<Match>): Match {
  seq += 1;
  return {
    id: partial.id ?? `m-${seq}`,
    parent_match_id: null,
    season_id: null,
    match_name: partial.match_name ?? `Match ${seq}`,
    match_date: partial.match_date ?? '2026-06-08',
    match_number: null,
    venue: null,
    is_super_over: partial.is_super_over ?? false,
    overs_per_innings: 10,
    players_per_team: 11,
    status: partial.status ?? 'completed',
    team_a_name: partial.team_a_name ?? 'Alpha',
    team_b_name: partial.team_b_name ?? 'Beta',
    team_a_captain_id: null,
    team_b_captain_id: null,
    toss_winner: null,
    toss_decision: null,
    batting_first: null,
    winner: partial.winner ?? null,
    player_of_match_id: null,
    result_text: null,
    notes: null,
    match_format: null,
  };
}

function matchPlayer(matchId: string, playerId: string, team: 'team_a' | 'team_b'): MatchPlayer {
  seq += 1;
  return { id: `mp-${seq}`, match_id: matchId, player_id: playerId, team, batting_order: null, is_captain: false, created_at: '2026-06-08' };
}

function inningsEvents(
  matchId: string,
  inningsId: string,
  batters: { id: string; runs: number }[],
  bowlerId: string
): BallEvent[] {
  let n = 1;
  return batters.map((b) => {
    seq += 1;
    return {
      id: `b-${seq}`,
      matchId,
      inningsId,
      sequenceNumber: n++,
      overNumber: 1,
      ballInOver: n,
      strikerId: b.id,
      nonStrikerId: 'x',
      bowlerId,
      runsBatter: b.runs as 0 | 1 | 2 | 3 | 4 | 6,
      runsExtra: 0,
      extraType: null,
      isWicket: false,
      wicketType: null,
      dismissedPlayerId: null,
      fielderId: null,
      isLegalDelivery: true,
      notes: null,
      createdBy: null,
      createdAt: '2026-06-08T00:00:00.000Z',
    };
  });
}

function availability(matchId: string, playerId: string, status: 'available' | 'unavailable'): Availability {
  seq += 1;
  return {
    id: `a-${seq}`,
    match_id: matchId,
    player_id: playerId,
    status,
    note: null,
    created_at: '2026-06-08',
    updated_at: '2026-06-08',
  };
}

interface Scenario {
  matches: Match[];
  matchPlayers: MatchPlayer[];
  ballEvents: BallEvent[];
}

/** Two completed matches where Alpha beats Beta (90/60 then 100/50). */
function dominantScenario(): Scenario {
  const m1 = match({ id: 'm1', match_name: 'Game 1', winner: 'team_a', team_a_name: 'Alpha', team_b_name: 'Beta' });
  const m2 = match({ id: 'm2', match_name: 'Game 2', winner: 'team_a', team_a_name: 'Alpha', team_b_name: 'Beta' });

  const players = [
    matchPlayer('m1', 'a1', 'team_a'),
    matchPlayer('m1', 'a2', 'team_a'),
    matchPlayer('m1', 'b1', 'team_b'),
    matchPlayer('m1', 'b2', 'team_b'),
    matchPlayer('m2', 'a1', 'team_a'),
    matchPlayer('m2', 'a2', 'team_a'),
    matchPlayer('m2', 'b1', 'team_b'),
    matchPlayer('m2', 'b2', 'team_b'),
  ];

  const events = [
    ...inningsEvents('m1', 'i1', [
      { id: 'a1', runs: 45 },
      { id: 'a2', runs: 45 },
    ], 'b1'),
    ...inningsEvents('m1', 'i2', [
      { id: 'b1', runs: 30 },
      { id: 'b2', runs: 30 },
    ], 'a1'),
    ...inningsEvents('m2', 'i3', [
      { id: 'a1', runs: 50 },
      { id: 'a2', runs: 50 },
    ], 'b2'),
    ...inningsEvents('m2', 'i4', [
      { id: 'b1', runs: 25 },
      { id: 'b2', runs: 25 },
    ], 'a2'),
  ];

  return { matches: [m1, m2], matchPlayers: players, ballEvents: events };
}

function compute(input: Partial<Parameters<typeof computeTeamStrengths>[0]>) {
  const base = dominantScenario();
  return computeTeamStrengths({
    teamAName: 'Alpha',
    teamBName: 'Beta',
    matches: base.matches,
    ballEvents: base.ballEvents,
    matchPlayers: base.matchPlayers,
    currentMatchPlayers: base.matchPlayers.filter((mp) => mp.match_id === 'm2'),
    availability: [],
    currentMatchId: 'm2',
    playersPerTeam: 11,
    ...input,
  });
}

describe('computeTeamStrengths', () => {
  it('gives the dominant side a higher overall score', () => {
    const { teamA, teamB } = compute({});
    expect(teamA.overall).toBeGreaterThan(teamB.overall);
  });

  it('reflects better batting in the batting score', () => {
    const { teamA, teamB } = compute({});
    expect(teamA.batting.score).toBeGreaterThan(teamB.batting.score);
    expect(teamA.batting.detail).toBe('95.0 runs/inn');
  });

  it('is neutral when teams are perfectly balanced', () => {
    const base = dominantScenario();
    const balancedEvents = [
      ...inningsEvents('m1', 'i1', [{ id: 'a1', runs: 35 }, { id: 'a2', runs: 35 }], 'b1'),
      ...inningsEvents('m1', 'i2', [{ id: 'b1', runs: 35 }, { id: 'b2', runs: 35 }], 'a1'),
      ...inningsEvents('m2', 'i3', [{ id: 'a1', runs: 35 }, { id: 'a2', runs: 35 }], 'b2'),
      ...inningsEvents('m2', 'i4', [{ id: 'b1', runs: 35 }, { id: 'b2', runs: 35 }], 'a2'),
    ];
    const { teamA, teamB } = compute({
      matches: [match({ id: 'm1', winner: 'team_a' }), match({ id: 'm2', winner: 'team_b' })],
      ballEvents: balancedEvents,
      matchPlayers: base.matchPlayers,
    });
    expect(teamA.batting.score).toBe(50);
    expect(teamB.batting.score).toBe(50);
    expect(Math.abs(teamA.overall - teamB.overall)).toBeLessThanOrEqual(2);
  });

  it('scores full availability as 100 and missing data as neutral 50', () => {
    const { teamA: full } = compute({
      availability: [
        availability('m2', 'a1', 'available'),
        availability('m2', 'a2', 'available'),
      ],
    });
    expect(full.availability.score).toBe(100);

    const { teamA: partial, teamB: partialB } = compute({
      availability: [availability('m2', 'a1', 'available'), availability('m2', 'a2', 'unavailable')],
    });
    expect(partial.availability.score).toBe(50);
    expect(partialB.availability.score).toBe(50);
  });

  it('stays neutral when there is no match data at all', () => {
    const { teamA, teamB } = compute({ matches: [], ballEvents: [], matchPlayers: [] });
    expect(teamA.matches).toBe(0);
    expect(teamB.matches).toBe(0);
    expect(teamA.overall).toBeGreaterThanOrEqual(45);
    expect(teamA.overall).toBeLessThanOrEqual(55);
  });
});
