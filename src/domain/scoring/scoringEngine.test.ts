import { describe, expect, it } from 'vitest';
import { calculateInningsState, undoLastBall } from './scoringEngine';
import type { BallEvent } from '../../types/models';

const ctx = {
  inningsId: 'inn-1',
  openingStrikerId: 'p1',
  openingNonStrikerId: 'p2',
  battingOrder: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
  oversPerInnings: 2,
  playersPerTeam: 6,
  targetRuns: null
};

function ball(partial: Partial<BallEvent> & Pick<BallEvent, 'sequenceNumber'>): BallEvent {
  return {
    id: `b-${partial.sequenceNumber}`,
    matchId: 'm-1',
    inningsId: 'inn-1',
    sequenceNumber: partial.sequenceNumber,
    overNumber: 0,
    ballInOver: 0,
    strikerId: partial.strikerId ?? 'p1',
    nonStrikerId: partial.nonStrikerId ?? 'p2',
    bowlerId: partial.bowlerId ?? 'b1',
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
    createdAt: '2026-06-08T00:00:00.000Z'
  };
}

describe('scoring engine', () => {
  it('handles wides as extras without legal ball or strike rotation', () => {
    const state = calculateInningsState(ctx, [
      ball({ sequenceNumber: 1, runsExtra: 1, extraType: 'wide', isLegalDelivery: false })
    ]);

    expect(state.totalRuns).toBe(1);
    expect(state.legalBalls).toBe(0);
    expect(state.strikerId).toBe('p1');
    expect(state.bowlingStats.b1.runsConceded).toBe(1);
  });

  it('handles no balls without legal ball and rotates on odd bat runs', () => {
    const state = calculateInningsState(ctx, [
      ball({ sequenceNumber: 1, runsBatter: 1, runsExtra: 1, extraType: 'no_ball', isLegalDelivery: false })
    ]);

    expect(state.totalRuns).toBe(2);
    expect(state.legalBalls).toBe(0);
    expect(state.battingStats.p1.runs).toBe(1);
    expect(state.strikerId).toBe('p2');
  });

  it('handles byes as legal balls without batter runs', () => {
    const state = calculateInningsState(ctx, [
      ball({ sequenceNumber: 1, runsExtra: 2, extraType: 'bye' })
    ]);

    expect(state.totalRuns).toBe(2);
    expect(state.legalBalls).toBe(1);
    expect(state.battingStats.p1.runs).toBe(0);
    expect(state.bowlingStats.b1.runsConceded).toBe(0);
  });

  it('handles leg byes and rotates strike on odd extras', () => {
    const state = calculateInningsState(ctx, [
      ball({ sequenceNumber: 1, runsExtra: 1, extraType: 'leg_bye' })
    ]);

    expect(state.totalRuns).toBe(1);
    expect(state.legalBalls).toBe(1);
    expect(state.strikerId).toBe('p2');
  });

  it('handles wickets and credits bowler only for bowler wicket types', () => {
    const state = calculateInningsState(ctx, [
      ball({ sequenceNumber: 1, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p1' }),
      ball({ sequenceNumber: 2, strikerId: 'p3', nonStrikerId: 'p2', isWicket: true, wicketType: 'run_out', dismissedPlayerId: 'p2' })
    ]);

    expect(state.wickets).toBe(2);
    expect(state.bowlingStats.b1.wickets).toBe(1);
    expect(state.strikerId).toBe('p3');
    expect(state.nonStrikerId).toBe('p4');
  });

  it('rotates strike on odd runs and again at over completion', () => {
    const events = [
      ball({ sequenceNumber: 1, runsBatter: 1 }),
      ball({ sequenceNumber: 2, strikerId: 'p2', nonStrikerId: 'p1' }),
      ball({ sequenceNumber: 3, strikerId: 'p2', nonStrikerId: 'p1' }),
      ball({ sequenceNumber: 4, strikerId: 'p2', nonStrikerId: 'p1' }),
      ball({ sequenceNumber: 5, strikerId: 'p2', nonStrikerId: 'p1' }),
      ball({ sequenceNumber: 6, strikerId: 'p2', nonStrikerId: 'p1' })
    ];
    const state = calculateInningsState(ctx, events);

    expect(state.legalBalls).toBe(6);
    expect(state.oversDisplay).toBe('1.0');
    expect(state.strikerId).toBe('p1');
  });

  it('completes the innings at the configured over limit', () => {
    const state = calculateInningsState({ ...ctx, oversPerInnings: 1 }, Array.from({ length: 6 }, (_, index) => ball({ sequenceNumber: index + 1 })));

    expect(state.isOversComplete).toBe(true);
    expect(state.isCompleted).toBe(true);
    expect(state.oversDisplay).toBe('1.0');
  });

  it('handles target chase completion and required run rate', () => {
    const state = calculateInningsState({ ...ctx, targetRuns: 8, oversPerInnings: 2 }, [
      ball({ sequenceNumber: 1, runsBatter: 4 }),
      ball({ sequenceNumber: 2, runsBatter: 4 })
    ]);

    expect(state.totalRuns).toBe(8);
    expect(state.isTargetReached).toBe(true);
    expect(state.isCompleted).toBe(true);
    expect(state.runsRequired).toBe(0);
  });

  it('undoes the last ball by removing the latest sequence and recalculating cleanly', () => {
    const events = [
      ball({ sequenceNumber: 1, runsBatter: 4 }),
      ball({ sequenceNumber: 2, runsExtra: 1, extraType: 'wide', isLegalDelivery: false }),
      ball({ sequenceNumber: 3, runsBatter: 6 })
    ];

    const before = calculateInningsState(ctx, events);
    const after = calculateInningsState(ctx, undoLastBall(events));

    expect(before.totalRuns).toBe(11);
    expect(after.totalRuns).toBe(5);
    expect(after.legalBalls).toBe(1);
    expect(after.battingStats.p1.runs).toBe(4);
    expect(after.bowlingStats.b1.runsConceded).toBe(5);
  });

  it('handles 2-player side and completes innings on final batsman dismissal', () => {
    const twoPlayerCtx = {
      ...ctx,
      playersPerTeam: 2,
      battingOrder: ['p1', 'p2']
    };

    const state = calculateInningsState(twoPlayerCtx, [
      ball({ sequenceNumber: 1, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p1' })
    ]);

    expect(state.wickets).toBe(1);
    expect(state.isAllOut).toBe(true);
    expect(state.isCompleted).toBe(true);
    expect(state.strikerId).toBeNull();
  });
});
