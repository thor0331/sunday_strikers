import type { BallEvent } from '../types/models';
import { isLegalDelivery, bowlerGetsWicket, formatOvers } from '../domain/scoring/scoringEngine';

export interface BatterSeasonStats {
  playerId: string;
  matches: number;
  innings: number;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  highestScore: number;
  notOuts: number;
  outs: number;
  average: number;
  strikeRate: number;
}

export interface BowlerSeasonStats {
  playerId: string;
  matches: number;
  innings: number;
  ballsBowled: number;
  overs: number;
  oversDisplay: string;
  maidens: number;
  runsConceded: number;
  wickets: number;
  dotBalls: number;
  economy: number;
  average: number | null;
  strikeRate: number | null;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
}

export interface FielderSeasonStats {
  playerId: string;
  catches: number;
  runOuts: number;
  stumpings: number;
  totalDismissals: number;
}

interface BattingAccumulator {
  matches: Set<string>;
  innings: Set<string>;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  outs: number;
  inningsRuns: Map<string, number>;
}

interface BowlingAccumulator {
  matches: Set<string>;
  innings: Set<string>;
  balls: number;
  runsConceded: number;
  wickets: number;
  dotBalls: number;
  overByBowler: Map<string, { inningsId: string; overNumber: number; legalBalls: number; conceded: number }>;
  inningsFigures: Map<string, { wickets: number; runs: number }>;
}

function isBatterBall(event: BallEvent): boolean {
  return isLegalDelivery(event) && event.extraType !== 'bye' && event.extraType !== 'leg_bye';
}

function isDotBall(event: BallEvent): boolean {
  return isLegalDelivery(event) && event.extraType !== 'bye' && event.extraType !== 'leg_bye' && event.runsBatter === 0 && event.runsExtra === 0;
}

function runsConcededBy(event: BallEvent): number {
  return event.extraType === 'bye' || event.extraType === 'leg_bye' ? event.runsBatter : event.runsBatter + event.runsExtra;
}

export function aggregateBatting(events: BallEvent[]): BatterSeasonStats[] {
  const map = new Map<string, BattingAccumulator>();

  for (const event of events) {
    if (event.strikerId) {
      let acc = map.get(event.strikerId);
      if (!acc) {
        acc = {
          matches: new Set(),
          innings: new Set(),
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          outs: 0,
          inningsRuns: new Map()
        };
        map.set(event.strikerId, acc);
      }
      acc.matches.add(event.matchId);
      acc.innings.add(event.inningsId);
      acc.runs += event.runsBatter;
      if (isBatterBall(event)) acc.balls += 1;
      if (event.runsBatter === 4) acc.fours += 1;
      if (event.runsBatter === 6) acc.sixes += 1;
      acc.inningsRuns.set(event.inningsId, (acc.inningsRuns.get(event.inningsId) ?? 0) + event.runsBatter);
    }

    if (event.isWicket && event.dismissedPlayerId) {
      let acc = map.get(event.dismissedPlayerId);
      if (!acc) {
        acc = {
          matches: new Set(),
          innings: new Set(),
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          outs: 0,
          inningsRuns: new Map()
        };
        map.set(event.dismissedPlayerId, acc);
      }
      acc.matches.add(event.matchId);
      acc.outs += 1;
    }
  }

  const result: BatterSeasonStats[] = [];
  for (const [playerId, acc] of map) {
    const innings = acc.innings.size;
    const outs = Math.min(acc.outs, innings);
    const runs = acc.runs;
    const inningsRuns = Array.from(acc.inningsRuns.values());
    const highestScore = inningsRuns.length > 0 ? Math.max(...inningsRuns) : 0;
    const fifties = inningsRuns.filter((r) => r >= 50 && r < 100).length;
    const hundreds = inningsRuns.filter((r) => r >= 100).length;
    result.push({
      playerId,
      matches: acc.matches.size,
      innings,
      runs,
      ballsFaced: acc.balls,
      fours: acc.fours,
      sixes: acc.sixes,
      fifties,
      hundreds,
      highestScore,
      notOuts: innings - outs,
      outs,
      average: outs > 0 ? Number((runs / outs).toFixed(2)) : runs,
      strikeRate: acc.balls > 0 ? Number(((runs / acc.balls) * 100).toFixed(2)) : 0
    });
  }

  return result.sort((a, b) => b.runs - a.runs);
}

export function aggregateBowling(events: BallEvent[]): BowlerSeasonStats[] {
  const map = new Map<string, BowlingAccumulator>();

  for (const event of events) {
    if (!event.bowlerId) continue;
    let acc = map.get(event.bowlerId);
    if (!acc) {
      acc = {
        matches: new Set(),
        innings: new Set(),
        balls: 0,
        runsConceded: 0,
        wickets: 0,
        dotBalls: 0,
        overByBowler: new Map(),
        inningsFigures: new Map()
      };
      map.set(event.bowlerId, acc);
    }

    const legal = isLegalDelivery(event);
    const conceded = runsConcededBy(event);
    const overKey = `${event.inningsId}:${event.overNumber}:${event.bowlerId}`;

    acc.matches.add(event.matchId);
    acc.innings.add(event.inningsId);
    if (legal) acc.balls += 1;
    acc.runsConceded += conceded;
    if (bowlerGetsWicket(event)) acc.wickets += 1;
    if (isDotBall(event)) acc.dotBalls += 1;

    const over = acc.overByBowler.get(overKey) ?? { inningsId: event.inningsId, overNumber: event.overNumber, legalBalls: 0, conceded: 0 };
    if (legal) over.legalBalls += 1;
    over.conceded += conceded;
    acc.overByBowler.set(overKey, over);

    const figures = acc.inningsFigures.get(event.inningsId) ?? { wickets: 0, runs: 0 };
    if (bowlerGetsWicket(event)) figures.wickets += 1;
    figures.runs += conceded;
    acc.inningsFigures.set(event.inningsId, figures);
  }

  const result: BowlerSeasonStats[] = [];
  for (const [playerId, acc] of map) {
    let maidens = 0;
    for (const over of acc.overByBowler.values()) {
      if (over.legalBalls === 6 && over.conceded === 0) maidens += 1;
    }

    let bestBowlingWickets = 0;
    let bestBowlingRuns = Infinity;
    for (const figures of acc.inningsFigures.values()) {
      if (figures.wickets > bestBowlingWickets || (figures.wickets === bestBowlingWickets && figures.runs < bestBowlingRuns)) {
        bestBowlingWickets = figures.wickets;
        bestBowlingRuns = figures.runs;
      }
    }
    if (bestBowlingWickets === 0) bestBowlingRuns = 0;

    const balls = acc.balls;
    const runsConceded = acc.runsConceded;
    const wickets = acc.wickets;
    result.push({
      playerId,
      matches: acc.matches.size,
      innings: acc.innings.size,
      ballsBowled: balls,
      overs: Math.floor(balls / 6),
      oversDisplay: formatOvers(balls),
      maidens,
      runsConceded,
      wickets,
      dotBalls: acc.dotBalls,
      economy: balls > 0 ? Number(((runsConceded * 6) / balls).toFixed(2)) : 0,
      average: wickets > 0 ? Number((runsConceded / wickets).toFixed(2)) : null,
      strikeRate: wickets > 0 ? Number((balls / wickets).toFixed(2)) : null,
      bestBowlingWickets,
      bestBowlingRuns
    });
  }

  return result.sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);
}

export function aggregateFielding(events: BallEvent[]): FielderSeasonStats[] {
  const map = new Map<string, { catches: number; runOuts: number; stumpings: number }>();

  for (const event of events) {
    if (!event.isWicket || !event.fielderId) continue;
    const acc = map.get(event.fielderId) ?? { catches: 0, runOuts: 0, stumpings: 0 };
    if (event.wicketType === 'caught') acc.catches += 1;
    if (event.wicketType === 'run_out') acc.runOuts += 1;
    if (event.wicketType === 'stumped') acc.stumpings += 1;
    map.set(event.fielderId, acc);
  }

  const result: FielderSeasonStats[] = [];
  for (const [playerId, acc] of map) {
    result.push({
      playerId,
      catches: acc.catches,
      runOuts: acc.runOuts,
      stumpings: acc.stumpings,
      totalDismissals: acc.catches + acc.runOuts + acc.stumpings
    });
  }

  return result.sort((a, b) => b.totalDismissals - a.totalDismissals);
}
