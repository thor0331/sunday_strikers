import { describe, expect, it } from 'vitest';
import type { BallEvent, DerivedInningsState } from '../types/models';
import {
  ballLabel,
  computeOverChartData,
  computeRunDistribution,
  computeHighestPartnership,
  computeBestBowlingSpell,
  computeMostExpensiveOver,
  computeMatchImpactScore,
  computeWinProbabilityForChase,
  computeBestBowlingFigures,
  computeFastestFifty,
  computeLargestSuccessfulChase,
  computeLowestTotalDefended,
  computeMostConsecutiveWins,
  type ImpactParams
} from './matchAnalytics';

let seq = 0;
function ball(partial: Partial<BallEvent>): BallEvent {
  seq += 1;
  return {
    id: `b-${seq}`,
    matchId: 'm-1',
    inningsId: 'inn-1',
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

describe('ballLabel', () => {
  it('labels wickets, wides, no balls and dots', () => {
    expect(ballLabel(ball({ isWicket: true })).label).toBe('W');
    expect(ballLabel(ball({ extraType: 'wide', runsExtra: 1, isLegalDelivery: false })).label).toBe('WD');
    expect(ballLabel(ball({ extraType: 'no_ball', runsExtra: 1, isLegalDelivery: false })).label).toBe('NB');
    expect(ballLabel(ball({})).label).toBe('•');
    expect(ballLabel(ball({ runsBatter: 4 })).label).toBe('4');
  });
});

describe('computeOverChartData', () => {
  it('groups balls by over, computes totals and milestones', () => {
    const data = computeOverChartData([
      ball({ overNumber: 0, runsBatter: 4 }),
      ball({ overNumber: 0, runsBatter: 1 }),
      ball({ overNumber: 1, runsBatter: 0 }),
      ball({ overNumber: 1, runsBatter: 0 }),
      ball({ overNumber: 1, runsBatter: 0 }),
      ball({ overNumber: 1, runsBatter: 0 }),
      ball({ overNumber: 1, runsBatter: 0 }),
      ball({ overNumber: 1, runsBatter: 0 })
    ], 4);
    expect(data.totalRuns).toBe(5);
    expect(data.averageRunsPerOver).toBe(2.5);
    expect(data.overs[0].runs).toBe(5);
    expect(data.overs[1].runs).toBe(0);
    expect(data.highestOver).toBe(1);
    expect(data.overs[0].isMilestone).toBe(true);
    expect(data.overs[0].milestoneLabel).toBe('Highest');
    expect(data.overs[1].isMilestone).toBe(true);
    expect(data.overs[1].milestoneLabel).toBe('Maiden');
  });
});

describe('computeRunDistribution', () => {
  it('classifies runs, dots and extras', () => {
    const dist = computeRunDistribution([
      ball({ runsBatter: 4 }),
      ball({ runsBatter: 6 }),
      ball({ runsBatter: 1 }),
      ball({ runsBatter: 0 }),
      ball({ runsBatter: 2 }),
      ball({ runsExtra: 2, extraType: 'wide', isLegalDelivery: false })
    ]);
    expect(dist.fours).toBe(1);
    expect(dist.sixes).toBe(1);
    expect(dist.singles).toBe(1);
    expect(dist.twos).toBe(1);
    expect(dist.dots).toBe(1);
    expect(dist.extras).toBe(2);
    expect(dist.totalRuns).toBe(15);
    expect(dist.boundaryRunPct).toBe(67);
    expect(dist.dotBallPct).toBe(20);
  });
});

describe('computeHighestPartnership', () => {
  it('finds the highest scoring pair and breaks on wickets', () => {
    const part = computeHighestPartnership([
      ball({ runsBatter: 4 }),
      ball({ runsBatter: 1, isWicket: true, wicketType: 'caught', dismissedPlayerId: 'p1', fielderId: 'p9' }),
      ball({ strikerId: 'p3', runsBatter: 2 }),
      ball({ strikerId: 'p3', runsBatter: 4 }),
      ball({ strikerId: 'p3', runsBatter: 4 })
    ]);
    expect(part).not.toBeNull();
    expect(part!.runs).toBe(10);
    expect(part!.b1).toBe('p3');
  });
});

describe('computeBestBowlingSpell', () => {
  it('credits bowler wickets and concedes runs', () => {
    const spell = computeBestBowlingSpell([
      ball({ runsBatter: 4 }),
      ball({ runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p1' }),
      ball({ bowlerId: 'bowl2', runsBatter: 0, isWicket: true, wicketType: 'caught', dismissedPlayerId: 'p2', fielderId: 'p5' }),
      ball({ bowlerId: 'bowl2', runsBatter: 1 }),
      ball({ bowlerId: 'bowl2', runsBatter: 0 }),
      ball({ runsBatter: 0 })
    ]);
    expect(spell).not.toBeNull();
    expect(spell!.bowlerId).toBe('bowl2');
    expect(spell!.wickets).toBe(1);
    expect(spell!.runsConceded).toBe(1);
  });
});

describe('computeMostExpensiveOver', () => {
  it('returns the highest scoring over', () => {
    const over = computeMostExpensiveOver([
      ball({ overNumber: 0, runsBatter: 4 }),
      ball({ overNumber: 0, runsBatter: 4 }),
      ball({ overNumber: 1, runsBatter: 6 })
    ]);
    expect(over).not.toBeNull();
    expect(over!.over).toBe(1);
    expect(over!.runs).toBe(8);
  });
});

describe('computeWinProbabilityForChase', () => {
  it('returns 100 when the chase is done', () => {
    expect(computeWinProbabilityForChase(120, 122, 2, 6, 5, 10)).toBe(100);
  });
  it('returns 0 when all out or overs done', () => {
    expect(computeWinProbabilityForChase(120, 60, 6, 6, 10, 10)).toBe(0);
    expect(computeWinProbabilityForChase(120, 60, 2, 6, 10, 10)).toBe(0);
  });
  it('penalises wickets lost during the chase', () => {
    const withWickets = computeWinProbabilityForChase(150, 100, 5, 6, 6, 10);
    const withFewWickets = computeWinProbabilityForChase(150, 100, 1, 6, 6, 10);
    expect(withFewWickets).toBeGreaterThan(withWickets);
  });
});

describe('computeMatchImpactScore', () => {
  function makeParams(overrides?: Partial<ImpactParams>): ImpactParams {
    const emptyInnings: DerivedInningsState = {
      inningsId: 'inn-1',
      totalRuns: 0,
      wickets: 0,
      legalBalls: 0,
      oversDisplay: '0.0',
      strikerId: null,
      nonStrikerId: null,
      currentBowlerId: null,
      battingStats: {},
      bowlingStats: {},
      currentRunRate: 0,
      requiredRunRate: null,
      targetRuns: null,
      runsRequired: null,
      ballsRemaining: null,
      isAllOut: false,
      isOversComplete: false,
      isTargetReached: false,
      isCompleted: false
    };
    return {
      match: {
        id: 'm-1',
        batting_first: 'team_a',
        status: 'completed',
        winner: 'team_a'
      } as ImpactParams['match'],
      innings1Stats: emptyInnings,
      innings2Stats: emptyInnings,
      ballEvents1: [],
      ballEvents2: [],
      playerMap: new Map([['p1', 'Virat'], ['p2', 'Rohit']]),
      ...overrides
    };
  }

  it('ranks a century higher than a wicketless knock', () => {
    const params = makeParams();
    params.innings1Stats = {
      ...params.innings1Stats!,
      battingStats: {
        p1: { playerId: 'p1', runs: 100, balls: 60, fours: 10, sixes: 2, isOut: false, dismissalText: null, strikeRate: 166.67 }
      }
    };
    params.innings2Stats = {
      ...params.innings2Stats!,
      battingStats: {
        p2: { playerId: 'p2', runs: 30, balls: 40, fours: 3, sixes: 0, isOut: true, dismissalText: 'caught', strikeRate: 75 }
      }
    };
    const result = computeMatchImpactScore(params);
    expect(result[0].playerId).toBe('p1');
    expect(result[0].breakdown.batting).toBeGreaterThan(0);
    expect(result[0].reason.length).toBeGreaterThan(0);
  });

  it('awards bowling impact and a reason string', () => {
    const params = makeParams();
    params.innings1Stats = {
      ...params.innings1Stats!,
      bowlingStats: {
        p1: { playerId: 'p1', balls: 24, oversDisplay: '4.0', runsConceded: 16, wickets: 3, maidens: 1, economy: 4 }
      }
    };
    const result = computeMatchImpactScore(params);
    expect(result[0].playerId).toBe('p1');
    expect(result[0].breakdown.bowling).toBeGreaterThan(0);
    expect(result[0].bowlingLabel).toContain('3 wickets');
  });

  it('is empty when nothing happened', () => {
    expect(computeMatchImpactScore(makeParams())).toEqual([]);
  });
});

describe('computeBestBowlingFigures', () => {
  it('finds the best innings figures by wickets then economy', () => {
    const figures = computeBestBowlingFigures([
      ball({ overNumber: 0, bowlerId: 'bowl1', runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p1' }),
      ball({ overNumber: 0, bowlerId: 'bowl1', runsBatter: 0 }),
      ball({ overNumber: 0, bowlerId: 'bowl1', runsBatter: 0, isWicket: true, wicketType: 'caught', dismissedPlayerId: 'p2', fielderId: 'p9' }),
      ball({ overNumber: 0, bowlerId: 'bowl1', runsBatter: 0 }),
      ball({ overNumber: 0, bowlerId: 'bowl1', runsBatter: 0 }),
      ball({ overNumber: 0, bowlerId: 'bowl1', runsBatter: 0 }),
      ball({ overNumber: 0, bowlerId: 'bowl1', runsBatter: 4 }),
      ball({ overNumber: 0, bowlerId: 'bowl2', runsBatter: 0, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'p3' }),
      ball({ overNumber: 0, bowlerId: 'bowl2', runsBatter: 0 })
    ]);
    expect(figures).not.toBeNull();
    expect(figures!.playerId).toBe('bowl1');
    expect(figures!.wickets).toBe(2);
    expect(figures!.runsConceded).toBe(4);
  });
});

describe('computeFastestFifty', () => {
  it('rewards the batter who reaches fifty quickest', () => {
    const fast = Array.from({ length: 21 }, (_, i) => ball({ strikerId: 'p1', runsBatter: i % 2 === 0 ? 4 : 1 }));
    const slow = Array.from({ length: 40 }, (_, i) => ball({ strikerId: 'p2', runsBatter: i % 5 === 0 ? 4 : 1 }));
    const fastest = computeFastestFifty([...slow, ...fast]);
    expect(fastest).not.toBeNull();
    expect(fastest!.playerId).toBe('p1');
  });
});

describe('computeLargestSuccessfulChase', () => {
  const innings = [
    { id: 'inn-a', match_id: 'm1', innings_number: 1, batting_team: 'team_a' as const },
    { id: 'inn-b', match_id: 'm1', innings_number: 2, batting_team: 'team_b' as const },
    { id: 'inn-c', match_id: 'm2', innings_number: 1, batting_team: 'team_a' as const },
    { id: 'inn-d', match_id: 'm2', innings_number: 2, batting_team: 'team_b' as const }
  ];
  const matches = [
    { id: 'm1', status: 'completed', winner: 'team_b', batting_first: 'team_a', team_a_name: 'A', team_b_name: 'B' },
    { id: 'm2', status: 'completed', winner: 'team_a', batting_first: 'team_a', team_a_name: 'A', team_b_name: 'B' }
  ] as unknown as Parameters<typeof computeLargestSuccessfulChase>[0];

  it('picks the biggest chase won by the chasing side', () => {
    const runs = new Map<string, number>([['inn-a', 100], ['inn-b', 101], ['inn-c', 150], ['inn-d', 120]]);
    const balls = new Map<string, number>([['inn-a', 60], ['inn-b', 36], ['inn-c', 60], ['inn-d', 60]]);
    const chase = computeLargestSuccessfulChase(matches, innings, runs, balls);
    expect(chase).not.toBeNull();
    expect(chase!.match.id).toBe('m1');
    expect(chase!.chaseRuns).toBe(101);
    expect(chase!.target).toBe(100);
  });

  it('ignores matches the chasing side lost', () => {
    const runs = new Map<string, number>([['inn-c', 150], ['inn-d', 120]]);
    const balls = new Map<string, number>([['inn-c', 60], ['inn-d', 60]]);
    expect(computeLargestSuccessfulChase(matches, innings, runs, balls)).toBeNull();
  });
});

describe('computeLowestTotalDefended', () => {
  const innings = [
    { id: 'inn-a', match_id: 'm1', innings_number: 1, batting_team: 'team_a' as const },
    { id: 'inn-b', match_id: 'm1', innings_number: 2, batting_team: 'team_b' as const },
    { id: 'inn-c', match_id: 'm2', innings_number: 1, batting_team: 'team_a' as const },
    { id: 'inn-d', match_id: 'm2', innings_number: 2, batting_team: 'team_b' as const }
  ];
  const matches = [
    { id: 'm1', status: 'completed', winner: 'team_a', batting_first: 'team_a', team_a_name: 'A', team_b_name: 'B' },
    { id: 'm2', status: 'completed', winner: 'team_b', batting_first: 'team_a', team_a_name: 'A', team_b_name: 'B' }
  ] as unknown as Parameters<typeof computeLowestTotalDefended>[0];

  it('finds the smallest first innings total that was defended', () => {
    const runs = new Map<string, number>([['inn-a', 85], ['inn-b', 70], ['inn-c', 120], ['inn-d', 130]]);
    const defended = computeLowestTotalDefended(matches, innings, runs);
    expect(defended).not.toBeNull();
    expect(defended!.total).toBe(85);
    expect(defended!.defenderName).toBe('A');
  });
});

describe('computeMostConsecutiveWins', () => {
  const mk = (id: string, date: string, winner: string, a = 'A', b = 'B') =>
    ({ id, match_date: date, status: 'completed', winner, team_a_name: a, team_b_name: b }) as unknown as Parameters<typeof computeMostConsecutiveWins>[0][number];

  it('finds the longest winning streak across matches', () => {
    const streak = computeMostConsecutiveWins([
      mk('1', '2026-01-01', 'team_a'),
      mk('2', '2026-01-03', 'team_a'),
      mk('3', '2026-01-05', 'team_b'),
      mk('4', '2026-01-07', 'team_b'),
      mk('5', '2026-01-09', 'team_b'),
      mk('6', '2026-01-11', 'team_a')
    ]);
    expect(streak).toEqual({ teamName: 'B', streak: 3 });
  });

  it('returns null without a streak of two', () => {
    expect(computeMostConsecutiveWins([
      mk('1', '2026-01-01', 'team_a'),
      mk('2', '2026-01-03', 'team_b')
    ])).toBeNull();
  });
});
