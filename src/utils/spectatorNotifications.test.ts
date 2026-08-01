import { describe, expect, it } from 'vitest';
import type { BallEvent, DerivedInningsState } from '../types/models';
import { buildSpectatorNotifications, detectMatchWon, type SpectatorNotificationInput } from './spectatorNotifications';

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
    fielderId: partial.fielderId ?? null,
    isLegalDelivery: partial.isLegalDelivery ?? true,
    notes: partial.notes ?? null,
    createdBy: null,
    createdAt: '2026-06-08T00:00:00.000Z',
  };
}

function state(partial: Partial<DerivedInningsState>): DerivedInningsState {
  return {
    inningsId: 'inn-1',
    totalRuns: partial.totalRuns ?? 0,
    wickets: partial.wickets ?? 0,
    legalBalls: partial.legalBalls ?? 0,
    oversDisplay: partial.oversDisplay ?? '0.0',
    strikerId: partial.strikerId ?? 'p1',
    nonStrikerId: partial.nonStrikerId ?? 'p2',
    currentBowlerId: partial.currentBowlerId ?? 'bowl1',
    battingStats: partial.battingStats ?? {},
    bowlingStats: partial.bowlingStats ?? {},
    currentRunRate: partial.currentRunRate ?? 0,
    requiredRunRate: partial.requiredRunRate ?? null,
    targetRuns: partial.targetRuns ?? null,
    runsRequired: partial.runsRequired ?? null,
    ballsRemaining: partial.ballsRemaining ?? null,
    isAllOut: partial.isAllOut ?? false,
    isOversComplete: partial.isOversComplete ?? false,
    isTargetReached: partial.isTargetReached ?? false,
    isCompleted: partial.isCompleted ?? false,
  };
}

function input(partial: Partial<SpectatorNotificationInput>): SpectatorNotificationInput {
  return {
    delta: partial.delta ?? [],
    ballEvents: partial.ballEvents ?? [],
    state: partial.state ?? null,
    playerMap: partial.playerMap ?? new Map([['p1', 'Alice'], ['p2', 'Bob'], ['bowl1', 'Bowler']]),
  };
}

describe('buildSpectatorNotifications', () => {
  it('returns nothing without a delta', () => {
    expect(buildSpectatorNotifications(input({ delta: [] }))).toEqual([]);
  });

  it('returns nothing without an innings state', () => {
    expect(buildSpectatorNotifications(input({ delta: [ball({ runsBatter: 4 })], state: null }))).toEqual([]);
  });

  it('classifies a four with the striker name', () => {
    const delta = [ball({ sequenceNumber: 5, runsBatter: 4 })];
    const result = buildSpectatorNotifications(
      input({
        delta,
        ballEvents: [...Array(4)].map((_, i) => ball({ sequenceNumber: i + 1 })),
        state: state({ totalRuns: 4, battingStats: { p1: { runs: 4 } } as never }),
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('four');
    expect(result[0].body).toBe('Alice');
  });

  it('classifies a six', () => {
    const delta = [ball({ sequenceNumber: 3, runsBatter: 6 })];
    const result = buildSpectatorNotifications(input({ delta, state: state({ totalRuns: 6 }) }));
    expect(result[0].kind).toBe('six');
  });

  it('classifies a wicket with the dismissed player', () => {
    const delta = [
      ball({
        sequenceNumber: 3,
        runsBatter: 0,
        isWicket: true,
        wicketType: 'caught',
        dismissedPlayerId: 'p2',
      }),
    ];
    const result = buildSpectatorNotifications(
      input({ delta, ballEvents: [ball({ sequenceNumber: 1 }), ball({ sequenceNumber: 2 })], state: state({}) })
    );
    const wicket = result.find((n) => n.kind === 'wicket');
    expect(wicket?.body).toBe('Bob');
  });

  it('detects a batter half-century crossed on the ball', () => {
    const delta = [ball({ sequenceNumber: 30, runsBatter: 4 })];
    const result = buildSpectatorNotifications(
      input({
        delta,
        ballEvents: [ball({ sequenceNumber: 29, runsBatter: 0 })],
        state: state({
          totalRuns: 50,
          battingStats: { p1: { runs: 50 } } as never,
        }),
      })
    );
    const fifty = result.find((n) => n.kind === 'batter-milestone');
    expect(fifty?.title).toBe('FIFTY');
    expect(fifty?.body).toBe('Alice');
  });

  it('detects a team 100 milestone', () => {
    const delta = [ball({ sequenceNumber: 60, runsBatter: 6 })];
    const result = buildSpectatorNotifications(
      input({
        delta,
        ballEvents: [ball({ sequenceNumber: 59, runsBatter: 0 })],
        state: state({ totalRuns: 100 }),
      })
    );
    expect(result.some((n) => n.kind === 'team-milestone' && n.title === '100 UP')).toBe(true);
  });

  it('detects a hat-trick across the last three legal balls', () => {
    const wicketBall = (n: number) =>
      ball({
        sequenceNumber: n,
        runsBatter: 0,
        isWicket: true,
        wicketType: 'bowled',
        dismissedPlayerId: `p${n}`,
        bowlerId: 'bowl1',
      });
    const previous = [wicketBall(10), wicketBall(11), wicketBall(12)];
    const delta = [previous[2]];
    const result = buildSpectatorNotifications(
      input({
        delta,
        ballEvents: previous,
        state: state({ totalRuns: 0, wickets: 3 }),
      })
    );
    const hatTrick = result.find((n) => n.kind === 'hat-trick');
    expect(hatTrick?.body).toBe('Bowler');
  });

  it('does not report a hat-trick when the three wickets are by different bowlers', () => {
    const previous = [
      ball({ sequenceNumber: 10, runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p3', bowlerId: 'bowl1' }),
      ball({ sequenceNumber: 11, runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p4', bowlerId: 'bowl1' }),
      ball({ sequenceNumber: 12, runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p5', bowlerId: 'bowl2' }),
    ];
    const result = buildSpectatorNotifications(
      input({ delta: [previous[2]], ballEvents: previous, state: state({}) })
    );
    expect(result.some((n) => n.kind === 'hat-trick')).toBe(false);
  });

  it('orders the latest-ball headline before milestone notices', () => {
    const delta = [ball({ sequenceNumber: 30, runsBatter: 4 })];
    const result = buildSpectatorNotifications(
      input({
        delta,
        ballEvents: [ball({ sequenceNumber: 29, runsBatter: 0 })],
        state: state({ totalRuns: 50, battingStats: { p1: { runs: 50 } } as never }),
      })
    );
    expect(result[0].kind).toBe('batter-milestone');
    expect(result[result.length - 1].kind).toBe('four');
  });
});

describe('detectMatchWon', () => {
  it('returns a match-won notification from result text', () => {
    const n = detectMatchWon('Sunday Strikers won by 12 runs');
    expect(n?.kind).toBe('match-won');
    expect(n?.title).toBe('MATCH WON');
    expect(n?.body).toBe('Sunday Strikers won by 12 runs');
  });

  it('returns null without result text', () => {
    expect(detectMatchWon(null)).toBeNull();
    expect(detectMatchWon(undefined)).toBeNull();
    expect(detectMatchWon('')).toBeNull();
  });
});
