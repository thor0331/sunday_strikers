import { describe, expect, it } from 'vitest';
import type { BallEvent } from '../types/models';
import { aggregateBatting, aggregateBowling, aggregateFielding } from './seasonStatistics';

let seq = 0;
function ball(partial: Partial<BallEvent>): BallEvent {
  seq += 1;
  return {
    id: `b-${seq}`,
    matchId: partial.matchId ?? 'm-1',
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
    fielderId: partial.fielderId ?? null,
    isLegalDelivery: partial.isLegalDelivery ?? true,
    notes: partial.notes ?? null,
    createdBy: null,
    createdAt: '2026-06-08T00:00:00.000Z'
  };
}

describe('aggregateBatting', () => {
  it('totals runs, balls, fours, sixes and innings across events', () => {
    const [s] = aggregateBatting([
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 6 }),
      ball({ strikerId: 'p1', runsBatter: 1 }),
      ball({ strikerId: 'p2', runsBatter: 2 })
    ]);
    expect(s.runs).toBe(11);
    expect(s.ballsFaced).toBe(3);
    expect(s.fours).toBe(1);
    expect(s.sixes).toBe(1);
    expect(s.innings).toBe(1);
    expect(s.highestScore).toBe(11);
    expect(s.notOuts).toBe(1);
    expect(s.average).toBe(11);
  });

  it('counts fifties and hundreds per innings', () => {
    const [s] = aggregateBatting([
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 4 })
    ]);
    expect(s.highestScore).toBe(64);
    expect(s.fifties).toBe(1);
    expect(s.hundreds).toBe(0);
  });

  it('counts outs and dismissals and computes not outs', () => {
    const [s] = aggregateBatting([
      ball({ strikerId: 'p1', runsBatter: 4 }),
      ball({ strikerId: 'p1', runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p1' })
    ]);
    expect(s.outs).toBe(1);
    expect(s.notOuts).toBe(0);
    expect(s.average).toBe(4);
  });

  it('counts runs, dismissals and matches across different innings and matches', () => {
    const [p1] = aggregateBatting([
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm1', inningsId: 'inn-1', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 6 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 4 }),
      ball({ matchId: 'm2', inningsId: 'inn-2', strikerId: 'p1', runsBatter: 0, isWicket: true, wicketType: 'caught', dismissedPlayerId: 'p1', fielderId: 'p9' })
    ]);
    expect(p1.matches).toBe(2);
    expect(p1.innings).toBe(2);
    expect(p1.runs).toBe(100);
    expect(p1.fifties).toBe(2);
    expect(p1.highestScore).toBe(50);
    expect(p1.outs).toBe(1);
    expect(p1.notOuts).toBe(1);
    expect(p1.average).toBe(100);
  });

  it('does not count wide or no-ball deliveries as balls faced', () => {
    const [s] = aggregateBatting([
      ball({ strikerId: 'p1', extraType: 'wide', runsExtra: 1, isLegalDelivery: false }),
      ball({ strikerId: 'p1', extraType: 'no_ball', runsExtra: 1, isLegalDelivery: false }),
      ball({ strikerId: 'p1', runsBatter: 1 })
    ]);
    expect(s.runs).toBe(1);
    expect(s.ballsFaced).toBe(1);
  });
});

describe('aggregateBowling', () => {
  it('counts legal balls, wickets and runs conceded', () => {
    const [s] = aggregateBowling([
      ball({ bowlerId: 'b1', runsBatter: 0 }),
      ball({ bowlerId: 'b1', runsBatter: 4 }),
      ball({ bowlerId: 'b1', runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p3' }),
      ball({ bowlerId: 'b1', runsBatter: 1, extraType: 'wide', runsExtra: 1, isLegalDelivery: false })
    ]);
    expect(s.ballsBowled).toBe(3);
    expect(s.runsConceded).toBe(6);
    expect(s.wickets).toBe(1);
    expect(s.oversDisplay).toBe('0.3');
    expect(s.economy).toBe(12);
  });

  it('does not credit byes or leg byes against the bowler', () => {
    const [s] = aggregateBowling([
      ball({ bowlerId: 'b1', runsBatter: 0, extraType: 'bye', runsExtra: 2, isLegalDelivery: true }),
      ball({ bowlerId: 'b1', runsBatter: 0, extraType: 'leg_bye', runsExtra: 1, isLegalDelivery: true }),
      ball({ bowlerId: 'b1', runsBatter: 1 })
    ]);
    expect(s.runsConceded).toBe(1);
  });

  it('only credits bowler wickets', () => {
    const [s] = aggregateBowling([
      ball({ bowlerId: 'b1', runsBatter: 0, isWicket: true, wicketType: 'run_out', dismissedPlayerId: 'p3', fielderId: 'p9' }),
      ball({ bowlerId: 'b1', runsBatter: 0, isWicket: true, wicketType: 'caught', dismissedPlayerId: 'p4', fielderId: 'p9' })
    ]);
    expect(s.wickets).toBe(1);
  });

  it('counts maidens for six legal balls with no runs conceded', () => {
    const [s] = aggregateBowling([
      ball({ bowlerId: 'b1', overNumber: 0, runsBatter: 0 }),
      ball({ bowlerId: 'b1', overNumber: 0, runsBatter: 0 }),
      ball({ bowlerId: 'b1', overNumber: 0, runsBatter: 0 }),
      ball({ bowlerId: 'b1', overNumber: 0, runsBatter: 0 }),
      ball({ bowlerId: 'b1', overNumber: 0, runsBatter: 0 }),
      ball({ bowlerId: 'b1', overNumber: 0, runsBatter: 0 }),
      ball({ bowlerId: 'b1', overNumber: 1, runsBatter: 4 })
    ]);
    expect(s.maidens).toBe(1);
    expect(s.overs).toBe(1);
    expect(s.oversDisplay).toBe('1.1');
  });

  it('finds best bowling figures by wickets then fewest runs', () => {
    const [s] = aggregateBowling([
      ball({ inningsId: 'inn-1', bowlerId: 'b1', runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p1' }),
      ball({ inningsId: 'inn-1', bowlerId: 'b1', runsBatter: 4 }),
      ball({ inningsId: 'inn-1', bowlerId: 'b1', runsBatter: 0 }),
      ball({ inningsId: 'inn-2', bowlerId: 'b1', runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p1' }),
      ball({ inningsId: 'inn-2', bowlerId: 'b1', runsBatter: 0 }),
      ball({ inningsId: 'inn-2', bowlerId: 'b1', runsBatter: 0 })
    ]);
    expect(s.bestBowlingWickets).toBe(1);
    expect(s.bestBowlingRuns).toBe(0);
  });

  it('computes average and strike rate only when wickets exist', () => {
    const [s] = aggregateBowling([
      ball({ bowlerId: 'b1', runsBatter: 4 }),
      ball({ bowlerId: 'b1', runsBatter: 2 })
    ]);
    expect(s.average).toBeNull();
    expect(s.strikeRate).toBeNull();
  });
});

describe('aggregateFielding', () => {
  it('counts catches, run outs and stumpings', () => {
    const [s] = aggregateFielding([
      ball({ fielderId: 'f1', isWicket: true, wicketType: 'caught', dismissedPlayerId: 'p3' }),
      ball({ fielderId: 'f1', isWicket: true, wicketType: 'run_out', dismissedPlayerId: 'p4' }),
      ball({ fielderId: 'f1', isWicket: true, wicketType: 'stumped', dismissedPlayerId: 'p5' }),
      ball({ fielderId: 'f2', isWicket: true, wicketType: 'caught', dismissedPlayerId: 'p6' })
    ]);
    expect(s.catches).toBe(1);
    expect(s.runOuts).toBe(1);
    expect(s.stumpings).toBe(1);
    expect(s.totalDismissals).toBe(3);
  });
});
