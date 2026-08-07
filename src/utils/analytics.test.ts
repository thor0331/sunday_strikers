import { describe, expect, it } from 'vitest';
import type { BallEvent, Innings, Match } from '../types/models';
import { computePlayerInningsScores, computeTeamStats } from './analytics';

function match(partial: Partial<Match>): Match {
  return {
    id: 'm-1',
    match_name: 'Match',
    match_date: '2026-06-01',
    status: 'completed',
    team_a_name: 'Lions',
    team_b_name: 'Tigers',
    winner: null,
    ...partial,
  } as Match;
}

function innings(partial: Partial<Innings>): Innings {
  return { id: 'inn-1', match_id: 'm-1', batting_team: 'team_a', ...partial } as Innings;
}

function ball(partial: Partial<BallEvent>): BallEvent {
  return {
    id: 'b-1',
    matchId: 'm-1',
    inningsId: 'inn-1',
    sequenceNumber: 1,
    overNumber: 0,
    ballInOver: 0,
    strikerId: 'p1',
    nonStrikerId: 'p2',
    bowlerId: 'bowl1',
    runsBatter: 0,
    runsExtra: 0,
    extraType: null,
    isWicket: false,
    wicketType: null,
    dismissedPlayerId: null,
    incomingBatsmanId: null,
    fielderId: null,
    isLegalDelivery: true,
    notes: null,
    createdBy: null,
    createdAt: '2026-06-08T00:00:00.000Z',
    ...partial,
  };
}

describe('computeTeamStats', () => {
  it('computes wins/losses by team name and ignores non-completed matches', () => {
    const m1 = match({ id: 'm1', team_a_name: 'Lions', team_b_name: 'Tigers', winner: 'team_a' });
    const m2 = match({ id: 'm2', team_a_name: 'Tigers', team_b_name: 'Lions', winner: 'team_a' });
    const upcoming = match({ id: 'm3', team_a_name: 'Lions', team_b_name: 'Tigers', winner: null, status: 'scheduled' });
    const unrelated = match({ id: 'm4', team_a_name: 'Eagles', team_b_name: 'Hawks', winner: 'team_a' });

    const stats = computeTeamStats([m1, m2, upcoming, unrelated], 'Lions');

    expect(stats.matchesPlayed).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.winPercentage).toBe(50);
  });

  it('derives runs, wickets, highest and average score from batting innings events', () => {
    const m1 = match({ id: 'm1', team_a_name: 'Lions', team_b_name: 'Tigers', winner: 'team_a' });
    const m2 = match({ id: 'm2', team_a_name: 'Tigers', team_b_name: 'Lions', winner: 'team_a' });

    const inn1 = innings({ id: 'inn1', match_id: 'm1', batting_team: 'team_a' });
    const inn2 = innings({ id: 'inn2', match_id: 'm2', batting_team: 'team_b' });
    const otherInn = innings({ id: 'inn3', match_id: 'm2', batting_team: 'team_a' });

    const events = [
      ball({ id: 'e1', inningsId: 'inn1', runsBatter: 4 }),
      ball({ id: 'e2', inningsId: 'inn1', runsBatter: 6 }),
      ball({ id: 'e3', inningsId: 'inn1', runsBatter: 4 }),
      ball({ id: 'e4', inningsId: 'inn1', runsBatter: 1, isWicket: true }),
      ball({ id: 'e5', inningsId: 'inn2', runsBatter: 2 }),
      ball({ id: 'e6', inningsId: 'inn2', runsBatter: 2, isWicket: true }),
      ball({ id: 'e7', inningsId: 'inn2', runsBatter: 0, isWicket: true }),
      ball({ id: 'e8', inningsId: 'inn3', runsBatter: 4 }),
    ];

    const stats = computeTeamStats([m1, m2], 'Lions', [inn1, inn2, otherInn], events);

    expect(stats.totalRuns).toBe(15 + 4);
    expect(stats.totalWickets).toBe(3);
    expect(stats.highestScore).toBe(15);
    expect(stats.avgScore).toBe(10);
  });
});

describe('computePlayerInningsScores', () => {
  it('returns the 5 most recent innings, ordered oldest to newest', () => {
    const playerId = 'p1';
    const byInnings = [
      innings({ id: 'inn-2026-06-10', match_id: 'm-2026-06-10', batting_team: 'team_a' }),
      innings({ id: 'inn-2026-06-07', match_id: 'm-2026-06-07', batting_team: 'team_a' }),
      innings({ id: 'inn-2026-06-04', match_id: 'm-2026-06-04', batting_team: 'team_a' }),
      innings({ id: 'inn-2026-06-01', match_id: 'm-2026-06-01', batting_team: 'team_a' }),
      innings({ id: 'inn-2026-05-28', match_id: 'm-2026-05-28', batting_team: 'team_a' }),
      innings({ id: 'inn-2026-05-25', match_id: 'm-2026-05-25', batting_team: 'team_a' }),
    ].map((inn) => ({
      innings: inn,
      match: match({ id: inn.match_id, match_name: inn.id, match_date: inn.id.replace('inn-', '') }),
      events: [ball({ inningsId: inn.id, strikerId: playerId, runsBatter: 6 })],
    }));

    const scores = computePlayerInningsScores(playerId, byInnings);

    expect(scores).toHaveLength(5);
    expect(scores.map((s) => s.matchName)).toEqual([
      'inn-2026-05-28',
      'inn-2026-06-01',
      'inn-2026-06-04',
      'inn-2026-06-07',
      'inn-2026-06-10',
    ]);
  });

  it('excludes innings where the player did not bat', () => {
    const playerId = 'p1';
    const byInnings = [
      { innings: innings({ id: 'inn-a' }), match: match({ id: 'm-a', match_date: '2026-06-01' }), events: [ball({ inningsId: 'inn-a', strikerId: 'someone-else' })] },
      { innings: innings({ id: 'inn-b' }), match: match({ id: 'm-b', match_date: '2026-06-02' }), events: [ball({ inningsId: 'inn-b', strikerId: playerId, runsBatter: 4 })] },
    ];

    const scores = computePlayerInningsScores(playerId, byInnings);

    expect(scores).toHaveLength(1);
    expect(scores[0].runs).toBe(4);
  });
});
