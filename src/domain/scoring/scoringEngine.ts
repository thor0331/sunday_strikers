import type { BallEvent, BatterInningsStats, BowlerInningsStats, DerivedInningsState } from '../../types/models';

export interface ScoringContext {
  inningsId: string;
  openingStrikerId: string;
  openingNonStrikerId: string;
  battingOrder: string[];
  oversPerInnings: number;
  playersPerTeam: number;
  targetRuns?: number | null;
}

const BOWLER_WICKET_TYPES = new Set(['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket']);

export function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function isLegalDelivery(event: Pick<BallEvent, 'extraType' | 'isLegalDelivery'>): boolean {
  if (event.extraType === 'wide' || event.extraType === 'no_ball') return false;
  return event.isLegalDelivery;
}

export function totalRunsForBall(event: Pick<BallEvent, 'runsBatter' | 'runsExtra'>): number {
  return event.runsBatter + event.runsExtra;
}

export function shouldRotateForRuns(event: Pick<BallEvent, 'runsBatter' | 'runsExtra' | 'extraType'>): boolean {
  if (event.extraType === 'bye' || event.extraType === 'leg_bye') return event.runsExtra % 2 === 1;
  return event.runsBatter % 2 === 1;
}

export function bowlerGetsWicket(event: BallEvent): boolean {
  return Boolean(event.isWicket && event.wicketType && BOWLER_WICKET_TYPES.has(event.wicketType));
}

export function createEmptyBatter(playerId: string): BatterInningsStats {
  return {
    playerId,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    isOut: false,
    dismissalText: null,
    strikeRate: 0
  };
}

export function createEmptyBowler(playerId: string): BowlerInningsStats {
  return {
    playerId,
    balls: 0,
    oversDisplay: '0.0',
    runsConceded: 0,
    wickets: 0,
    maidens: 0,
    economy: 0
  };
}

export function calculateInningsState(context: ScoringContext, events: BallEvent[]): DerivedInningsState {
  const ordered = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const battingStats: Record<string, BatterInningsStats> = {};
  const bowlingStats: Record<string, BowlerInningsStats> = {};
  const overRunsByBowlerAndOver = new Map<string, number>();

  let totalRuns = 0;
  let wickets = 0;
  let legalBalls = 0;
  let strikerId: string | null = context.openingStrikerId;
  let nonStrikerId: string | null = context.openingNonStrikerId;
  let currentBowlerId: string | null = null;
  let nextBatterIndex = 2;

  const getBatter = (playerId: string) => {
    battingStats[playerId] ??= createEmptyBatter(playerId);
    return battingStats[playerId];
  };

  const getBowler = (playerId: string) => {
    bowlingStats[playerId] ??= createEmptyBowler(playerId);
    return bowlingStats[playerId];
  };

  getBatter(context.openingStrikerId);
  getBatter(context.openingNonStrikerId);

  for (const event of ordered) {
    if (strikerId === null || nonStrikerId === null) break;

    const legal = isLegalDelivery(event);
    const ballRuns = totalRunsForBall(event);
    const batter = getBatter(event.strikerId);
    const bowler = getBowler(event.bowlerId);
    const overKey = `${event.bowlerId}:${Math.floor(legalBalls / 6)}`;

    totalRuns += ballRuns;
    currentBowlerId = event.bowlerId;
    batter.runs += event.runsBatter;
    if (event.runsBatter === 4) batter.fours += 1;
    if (event.runsBatter === 6) batter.sixes += 1;

    if (legal && event.extraType !== 'bye' && event.extraType !== 'leg_bye') {
      batter.balls += 1;
    }

    if (legal) {
      legalBalls += 1;
      bowler.balls += 1;
    }

    const conceded = event.extraType === 'bye' || event.extraType === 'leg_bye' ? event.runsBatter : ballRuns;
    bowler.runsConceded += conceded;
    overRunsByBowlerAndOver.set(overKey, (overRunsByBowlerAndOver.get(overKey) ?? 0) + conceded);

    if (bowlerGetsWicket(event)) {
      bowler.wickets += 1;
    }

    if (event.isWicket && event.dismissedPlayerId) {
      wickets += 1;
      const dismissed = getBatter(event.dismissedPlayerId);
      dismissed.isOut = true;
      dismissed.dismissalText = event.wicketType;

      if (event.dismissedPlayerId === strikerId) {
        strikerId = context.battingOrder[nextBatterIndex] ?? null;
        if (strikerId) getBatter(strikerId);
        nextBatterIndex += 1;
      } else if (event.dismissedPlayerId === nonStrikerId) {
        nonStrikerId = context.battingOrder[nextBatterIndex] ?? null;
        if (nonStrikerId) getBatter(nonStrikerId);
        nextBatterIndex += 1;
      }
    }

    if (shouldRotateForRuns(event)) {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
    }

    if (legal && legalBalls % 6 === 0) {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
    }

    const targetReached = context.targetRuns != null && totalRuns >= context.targetRuns;
    const allOut = wickets >= context.playersPerTeam - 1;
    const oversComplete = legalBalls >= context.oversPerInnings * 6;
    if (targetReached || allOut || oversComplete) break;
  }

  for (const batter of Object.values(battingStats)) {
    batter.strikeRate = batter.balls === 0 ? 0 : Number(((batter.runs / batter.balls) * 100).toFixed(2));
  }

  for (const bowler of Object.values(bowlingStats)) {
    bowler.oversDisplay = formatOvers(bowler.balls);
    bowler.economy = bowler.balls === 0 ? 0 : Number(((bowler.runsConceded * 6) / bowler.balls).toFixed(2));
  }

  for (const [key, runs] of overRunsByBowlerAndOver.entries()) {
    const [bowlerId] = key.split(':');
    if (runs === 0 && bowlingStats[bowlerId]) bowlingStats[bowlerId].maidens += 1;
  }

  const maxBalls = context.oversPerInnings * 6;
  const ballsRemaining = Math.max(maxBalls - legalBalls, 0);
  const targetRuns = context.targetRuns ?? null;
  const runsRequired = targetRuns == null ? null : Math.max(targetRuns - totalRuns, 0);
  const currentRunRate = legalBalls === 0 ? 0 : Number(((totalRuns * 6) / legalBalls).toFixed(2));
  const requiredRunRate = runsRequired == null || ballsRemaining === 0 ? null : Number(((runsRequired * 6) / ballsRemaining).toFixed(2));
  const isAllOut = wickets >= context.playersPerTeam - 1;
  const isOversComplete = legalBalls >= maxBalls;
  const isTargetReached = targetRuns != null && totalRuns >= targetRuns;

  return {
    inningsId: context.inningsId,
    totalRuns,
    wickets,
    legalBalls,
    oversDisplay: formatOvers(legalBalls),
    strikerId,
    nonStrikerId,
    currentBowlerId,
    battingStats,
    bowlingStats,
    currentRunRate,
    requiredRunRate,
    targetRuns,
    runsRequired,
    ballsRemaining: targetRuns == null ? null : ballsRemaining,
    isAllOut,
    isOversComplete,
    isTargetReached,
    isCompleted: isAllOut || isOversComplete || isTargetReached
  };
}

export function undoLastBall(events: BallEvent[]): BallEvent[] {
  if (events.length === 0) return [];
  const latestSequence = Math.max(...events.map((event) => event.sequenceNumber));
  return events.filter((event) => event.sequenceNumber !== latestSequence);
}
