import type { BallEvent } from '../types/models';
import { aggregateBatting, aggregateBowling, aggregateFielding } from './seasonStatistics';

export interface POTMRecommendation {
  playerId: string;
  name: string;
  impact: number;
  confidence: number;
  confidenceLabel: string;
  battingFactor: number;
  bowlingFactor: number;
  fieldingFactor: number;
  reason: string;
  battingLine: string | null;
  bowlingLine: string | null;
  fieldingLine: string | null;
}

export interface POTMRecommendationParams {
  events: BallEvent[];
  playerMap: Map<string, string>;
  chasePlayerIds: Set<string>;
  chaseState: {
    totalRuns: number;
    wickets: number;
    targetRuns: number;
    legalBalls: number;
    oversPerInnings: number;
  } | null;
}

export function computePOTMRecommendation(params: POTMRecommendationParams): POTMRecommendation | null {
  const { events, playerMap, chasePlayerIds, chaseState } = params;
  if (events.length === 0) return null;

  const batting = aggregateBatting(events);
  const bowling = aggregateBowling(events);
  const fielding = aggregateFielding(events);

  const battingById = new Map(batting.map((b) => [b.playerId, b]));
  const bowlingById = new Map(bowling.map((b) => [b.playerId, b]));
  const fieldingById = new Map(fielding.map((f) => [f.playerId, f]));

  const playerIds = new Set([...battingById.keys(), ...bowlingById.keys(), ...fieldingById.keys()]);

  const chaseAhead =
    chaseState &&
    chaseState.targetRuns > 0 &&
    chaseState.legalBalls > 0 &&
    chaseState.oversPerInnings > 0
      ? (chaseState.totalRuns / chaseState.legalBalls) * 6 >=
        (chaseState.targetRuns * 6) / (chaseState.oversPerInnings * 6)
      : false;

  let best: { playerId: string; impact: number } | null = null;
  let secondBest: { impact: number } | null = null;

  for (const playerId of playerIds) {
    const b = battingById.get(playerId);
    const bowl = bowlingById.get(playerId);
    const f = fieldingById.get(playerId);

    let battingFactor = 0;
    let bowlingFactor = 0;
    let fieldingFactor = 0;

    if (b && (b.runs > 0 || b.ballsFaced > 0)) {
      const sr = b.strikeRate ?? 0;
      battingFactor = Math.min(1, b.runs / 40 + Math.max(0, sr - 80) / 300 + b.sixes / 6 + b.fours / 20);
      if (chasePlayerIds.has(playerId)) {
        battingFactor = Math.min(1, battingFactor + 0.12);
        if (chaseAhead && sr >= 130) battingFactor = Math.min(1, battingFactor + 0.08);
      }
    }

    if (bowl && bowl.ballsBowled > 0) {
      const econ = bowl.economy ?? 0;
      bowlingFactor = Math.min(1, bowl.wickets / 4 + Math.max(0, 8 - econ) / 12 + bowl.maidens / 3);
    }

    if (f && f.totalDismissals > 0) {
      fieldingFactor = Math.min(1, f.catches / 3 + f.runOuts / 2 + f.stumpings / 2);
    }

    if (battingFactor === 0 && bowlingFactor === 0 && fieldingFactor === 0) continue;

    const impact = Math.round((battingFactor * 0.45 + bowlingFactor * 0.4 + fieldingFactor * 0.15) * 100);

    if (!best || impact > best.impact) {
      secondBest = best ? { impact: best.impact } : null;
      best = { playerId, impact };
    } else if (!secondBest || impact > secondBest.impact) {
      secondBest = { impact };
    }
  }

  if (!best || best.impact <= 0) return null;

  const margin = secondBest ? best.impact - secondBest.impact : 40;
  const confidence = Math.min(
    97,
    Math.max(50, Math.round(45 + best.impact * 0.55 + Math.min(5, margin / 8)))
  );
  const confidenceLabel =
    confidence >= 88 ? 'Very High' : confidence >= 75 ? 'High' : confidence >= 62 ? 'Medium' : 'Low';

  const playerId = best.playerId;
  const b = battingById.get(playerId);
  const bowl = bowlingById.get(playerId);
  const f = fieldingById.get(playerId);

  const battingLine = b && (b.runs > 0 || b.ballsFaced > 0) ? `${b.runs}(${b.ballsFaced})` : null;
  const bowlingLine =
    bowl && bowl.ballsBowled > 0 ? `${bowl.wickets}/${bowl.runsConceded} • Eco ${bowl.economy}` : null;
  const fieldingLine =
    f && f.totalDismissals > 0
      ? [
          f.catches > 0 ? `${f.catches} catch${f.catches === 1 ? '' : 'es'}` : null,
          f.runOuts > 0 ? `${f.runOuts} run out${f.runOuts === 1 ? '' : 's'}` : null,
          f.stumpings > 0 ? `${f.stumpings} stumping${f.stumpings === 1 ? '' : 's'}` : null,
        ]
          .filter(Boolean)
          .join(' • ')
      : null;

  const reasonParts: string[] = [];
  if (b && b.ballsFaced > 0) {
    const sr = b.strikeRate ?? 0;
    reasonParts.push(`Winning SR ${Math.round(sr)}`);
  }
  if (chasePlayerIds.has(playerId)) {
    reasonParts.push(chaseAhead ? 'Chasing comfortably' : 'Finished the chase');
  }
  if (bowl && bowl.wickets >= 3) reasonParts.push('Match-winning spell');
  if (reasonParts.length === 0) reasonParts.push('Balanced all-round contribution');

  return {
    playerId,
    name: playerMap.get(playerId) ?? 'Player',
    impact: best.impact,
    confidence,
    confidenceLabel,
    battingFactor: battingFactorFor(battingById.get(playerId), chasePlayerIds.has(playerId), chaseAhead),
    bowlingFactor: bowlingFactorFor(bowlingById.get(playerId)),
    fieldingFactor: fieldingFactorFor(fieldingById.get(playerId)),
    reason: reasonParts.join(' • '),
    battingLine,
    bowlingLine,
    fieldingLine,
  };
}

function battingFactorFor(
  b:
    | {
        runs: number;
        ballsFaced: number;
        strikeRate: number | null;
        sixes: number;
        fours: number;
      }
    | undefined,
  inChase: boolean,
  chaseAhead: boolean
): number {
  if (!b) return 0;
  const sr = b.strikeRate ?? 0;
  let factor = Math.min(1, b.runs / 40 + Math.max(0, sr - 80) / 300 + b.sixes / 6 + b.fours / 20);
  if (inChase) {
    factor = Math.min(1, factor + 0.12);
    if (chaseAhead && sr >= 130) factor = Math.min(1, factor + 0.08);
  }
  return Math.round(factor * 100);
}

function bowlingFactorFor(
  b: { wickets: number; economy: number | null; maidens: number } | undefined
): number {
  if (!b) return 0;
  const econ = b.economy ?? 0;
  return Math.round(Math.min(1, b.wickets / 4 + Math.max(0, 8 - econ) / 12 + b.maidens / 3) * 100);
}

function fieldingFactorFor(
  f: { catches: number; runOuts: number; stumpings: number } | undefined
): number {
  if (!f) return 0;
  return Math.round(Math.min(1, f.catches / 3 + f.runOuts / 2 + f.stumpings / 2) * 100);
}
