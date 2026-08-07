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
    incomingBatsmanId: partial.incomingBatsmanId ?? null,
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

  it('completes innings when squad size is less than playersPerTeam and final wicket falls', () => {
    const customCtx = {
      ...ctx,
      playersPerTeam: 6,
      battingOrder: ['p1', 'p2', 'p3', 'p4', 'p5']
    };

    const state = calculateInningsState(customCtx, [
      ball({ sequenceNumber: 1, isWicket: true, dismissedPlayerId: 'p1' }),
      ball({ sequenceNumber: 2, isWicket: true, dismissedPlayerId: 'p3' }),
      ball({ sequenceNumber: 3, isWicket: true, dismissedPlayerId: 'p4' }),
      ball({ sequenceNumber: 4, isWicket: true, dismissedPlayerId: 'p2' })
    ]);

    expect(state.wickets).toBe(4);
    expect(state.isAllOut).toBe(true);
    expect(state.isCompleted).toBe(true);
  });

  it('handles final wicket when all remaining batsmen are dismissed with no batsmen left', () => {
    const twoPlayerCtx = {
      ...ctx,
      playersPerTeam: 2,
      battingOrder: ['p1', 'p2']
    };

    // First wicket dismisses p1 at strike (p2 becomes striker), second dismisses p2 (all-out)
    // After p1 is out, p2 is at strike and there's no one left, so next wicket will be all-out
    const state = calculateInningsState(twoPlayerCtx, [
      ball({ sequenceNumber: 1, strikerId: 'p1', nonStrikerId: 'p2', isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p1' })
    ]);

    expect(state.wickets).toBe(1);
    expect(state.isAllOut).toBe(true);
    expect(state.isCompleted).toBe(true);
    expect(state.strikerId).toBeNull(); // No more batters available at striker position
  });

  it('applies a creaseOverride before any delivery reflects the change', () => {
    const state = calculateInningsState(
      { ...ctx, creaseOverride: { strikerId: 'p3', nonStrikerId: 'p2' } },
      []
    );

    expect(state.strikerId).toBe('p3');
    expect(state.nonStrikerId).toBe('p2');
    expect(state.battingStats.p3.runs).toBe(0);
  });

  it('applies a creaseOverride for a mid-innings swap before it is reflected in a ball event', () => {
    const events = [ball({ sequenceNumber: 1, runsBatter: 1 })];
    const state = calculateInningsState(
      { ...ctx, creaseOverride: { strikerId: 'p1', nonStrikerId: 'p3' } },
      events
    );

    // p1 is derived striker after ball 1 (odd run rotates p1->p2, p2->p1, so p1 faces again),
    // and p3 has not yet faced -> the override promotes p3 to non-striker.
    expect(state.strikerId).toBe('p1');
    expect(state.nonStrikerId).toBe('p3');
  });

  it('applies the override unconditionally once passed (the caller gates staleness)', () => {
    const events = [ball({ sequenceNumber: 1, runsBatter: 2, strikerId: 'p1', nonStrikerId: 'p3' })];
    const state = calculateInningsState(
      { ...ctx, creaseOverride: { strikerId: 'p1', nonStrikerId: 'p3' } },
      events
    );

    expect(state.strikerId).toBe('p1');
    expect(state.nonStrikerId).toBe('p3');
  });

  it('trusts the crease recorded on a ball event after a manual swap, without an override', () => {
    const events = [
      ball({ sequenceNumber: 1, runsBatter: 1 }),
      ball({ sequenceNumber: 2, strikerId: 'p2', nonStrikerId: 'p1', runsBatter: 1 }),
      ball({ sequenceNumber: 3, strikerId: 'p1', nonStrikerId: 'p3', runsBatter: 0 })
    ];

    const state = calculateInningsState(ctx, events);

    expect(state.strikerId).toBe('p1');
    expect(state.nonStrikerId).toBe('p3');
  });

  it('creates a batting stats entry for a swapped-in non-striker who has not faced a ball', () => {
    const events = [
      ball({ sequenceNumber: 1, runsBatter: 1 }),
      ball({ sequenceNumber: 2, strikerId: 'p1', nonStrikerId: 'p3', runsBatter: 0 })
    ];

    const state = calculateInningsState(ctx, events);

    expect(state.battingStats.p3).toBeDefined();
    expect(state.battingStats.p3.runs).toBe(0);
    expect(state.battingStats.p3.balls).toBe(0);
    expect(state.nonStrikerId).toBe('p3');
  });

  it('replays natural rotations from recorded creases consistently', () => {
    const events = [
      ball({ sequenceNumber: 1, runsBatter: 1 }),
      ball({ sequenceNumber: 2, strikerId: 'p2', nonStrikerId: 'p1', runsBatter: 0 }),
      ball({ sequenceNumber: 3, strikerId: 'p2', nonStrikerId: 'p1', runsBatter: 1 })
    ];

    const state = calculateInningsState(ctx, events);

    expect(state.strikerId).toBe('p1');
    expect(state.nonStrikerId).toBe('p2');
  });

  it('trusts the recorded incoming batsman on a wicket even when the batting order dedupes them early', () => {
    // p1 opened the innings (stale opener in over-1 records), p3 was swapped in as
    // non-striker for over-2. A wicket then dismisses the striker (p2) and the scorer
    // explicitly selects p1 (Ankith) as incoming. Because p1 already appears earlier in
    // the event history, determineBattingOrder dedupes it, so battingOrder[2] === 'p3'.
    // The engine must trust the recorded incomingBatsmanId over the derived index.
    const events = [
      ...Array.from({ length: 6 }, (_, index) =>
        ball({ sequenceNumber: index + 1, strikerId: 'p1', nonStrikerId: 'p2', runsBatter: 0 })
      ),
      ball({
        sequenceNumber: 7,
        strikerId: 'p2',
        nonStrikerId: 'p3',
        isWicket: true,
        wicketType: 'bowled',
        dismissedPlayerId: 'p2',
        incomingBatsmanId: 'p1'
      })
    ];

    const state = calculateInningsState(ctx, events);

    expect(state.wickets).toBe(1);
    expect(state.strikerId).toBe('p1');
    expect(state.nonStrikerId).toBe('p3');
  });

  it('trusts the recorded incoming batsman when the dismissed batter is the non-striker', () => {
    const events = [
      ball({ sequenceNumber: 1, strikerId: 'p1', nonStrikerId: 'p2', runsBatter: 0 }),
      ball({
        sequenceNumber: 2,
        strikerId: 'p1',
        nonStrikerId: 'p3',
        isWicket: true,
        wicketType: 'run_out',
        dismissedPlayerId: 'p3',
        incomingBatsmanId: 'p4'
      })
    ];

    const state = calculateInningsState(ctx, events);

    expect(state.strikerId).toBe('p1');
    expect(state.nonStrikerId).toBe('p4');
  });

  it('falls back to the next batting-order index for legacy wicket events without an incoming batsman', () => {
    const events = [
      ball({ sequenceNumber: 1, strikerId: 'p1', nonStrikerId: 'p2', runsBatter: 0 }),
      ball({
        sequenceNumber: 2,
        strikerId: 'p1',
        nonStrikerId: 'p2',
        isWicket: true,
        wicketType: 'bowled',
        dismissedPlayerId: 'p1',
        incomingBatsmanId: null
      })
    ];

    const state = calculateInningsState(ctx, events);

    expect(state.strikerId).toBe('p3');
    expect(state.nonStrikerId).toBe('p2');
  });
});
