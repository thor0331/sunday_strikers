import { describe, expect, it } from 'vitest';
import type { Availability, BallEvent, Match, MatchPlayer } from '../types/models';
import { buildPlayerDashboardData, type PlayerStatsSource } from './playerDashboard';

let seq = 0;
function ball(partial: Partial<BallEvent>): BallEvent {
  seq += 1;
  return {
    id: `b-${seq}`,
    matchId: partial.matchId ?? 'm1',
    inningsId: partial.inningsId ?? 'inn-1',
    sequenceNumber: seq,
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

function availability(partial: Partial<Availability>): Availability {
  return {
    id: partial.id ?? 'a-1',
    match_id: partial.match_id ?? 'm1',
    player_id: partial.player_id ?? 'p1',
    status: partial.status ?? 'available',
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
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

describe('buildPlayerDashboardData', () => {
  it('computes matches played, wins, win pct and POTM from matches and match_players', () => {
    const data = buildPlayerDashboardData('p1', source({
      matches: [match({ id: 'm1', winner: 'team_a', player_of_match_id: 'p1', result_text: 'Won by 20 runs', match_name: 'Final' })],
      matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' })],
    }));

    expect(data.matchesPlayed).toBe(1);
    expect(data.wins).toBe(1);
    expect(data.winPct).toBe(100);
    expect(data.potmCount).toBe(1);
    expect(data.statsLike.matches_played).toBe(1);
    expect(data.recentMatches[0]).toMatchObject({ name: 'Final', result: 'Won by 20 runs' });
  });

  it('only counts matches where the player appears in match_players', () => {
    const data = buildPlayerDashboardData('p1', source({
      matches: [
        match({ id: 'm1', winner: 'team_a' }),
        match({ id: 'm2', winner: 'team_b' }),
      ],
      matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' })],
    }));

    expect(data.matchesPlayed).toBe(1);
    expect(data.wins).toBe(1);
    expect(data.winPct).toBe(100);
  });

  it('computes availability percentage from responses', () => {
    const data = buildPlayerDashboardData('p1', source({
      matches: [
        match({ id: 'm1', winner: 'team_a' }),
        match({ id: 'm2', winner: 'team_a' }),
        match({ id: 'm3', winner: 'team_a' }),
      ],
      matchPlayers: [
        matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' }),
        matchPlayer({ match_id: 'm2', player_id: 'p1', team: 'team_a' }),
        matchPlayer({ match_id: 'm3', player_id: 'p1', team: 'team_a' }),
      ],
      allAvailability: [
        availability({ match_id: 'm1', player_id: 'p1', status: 'available' }),
        availability({ match_id: 'm2', player_id: 'p1', status: 'unavailable' }),
        availability({ match_id: 'm3', player_id: 'p1', status: 'maybe' }),
      ],
    }));

    expect(data.availabilityPct).toBe(33);
    expect(data.availabilityLabel).toBe('1/3');
  });

  it('aggregates batting, bowling and fielding from ball events', () => {
    const data = buildPlayerDashboardData('p1', source({
      matches: [match({ id: 'm1', winner: 'team_a' })],
      matchPlayers: [matchPlayer({ match_id: 'm1', player_id: 'p1', team: 'team_a' })],
      events: [
        ball({ matchId: 'm1', strikerId: 'p1', runsBatter: 4 }),
        ball({ matchId: 'm1', strikerId: 'p1', runsBatter: 6 }),
        ball({ matchId: 'm1', bowlerId: 'p1', runsExtra: 0 }),
        ball({ matchId: 'm1', bowlerId: 'p1', runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p2', fielderId: null }),
        ball({ matchId: 'm1', isWicket: true, wicketType: 'caught', fielderId: 'p1', dismissedPlayerId: 'p3' }),
      ],
    }));

    expect(data.batting?.runs).toBe(10);
    expect(data.bowling?.wickets).toBe(1);
    expect(data.fielding?.catches).toBe(1);
    expect(data.statsLike.runs).toBe(10);
    expect(data.statsLike.wickets).toBe(1);
    expect(data.statsLike.catches).toBe(1);
  });

  it('sorts recent matches by date descending and caps at 5', () => {
    const matches = Array.from({ length: 6 }, (_, i) =>
      match({ id: `m${i}`, match_date: `2026-06-${String(i + 1).padStart(2, '0')}` })
    );
    const data = buildPlayerDashboardData('p1', source({
      matches,
      matchPlayers: matches.map((m) => matchPlayer({ match_id: m.id, player_id: 'p1', team: 'team_a' })),
    }));

    expect(data.recentMatches).toHaveLength(5);
    expect(data.recentMatches[0].date).toBe('2026-06-06');
    expect(data.recentMatches[4].date).toBe('2026-06-02');
  });

  it('returns zeros and no matches for a player with no data', () => {
    const data = buildPlayerDashboardData('ghost', source({}));
    expect(data.matchesPlayed).toBe(0);
    expect(data.winPct).toBe(0);
    expect(data.potmCount).toBe(0);
    expect(data.availabilityPct).toBe(0);
    expect(data.batting).toBeNull();
    expect(data.recentMatches).toEqual([]);
  });
});
