import type { BallEvent, DerivedInningsState, Match } from '../types/models';

export interface OverBall {
  label: string;
  runs: number;
  isWicket: boolean;
  isExtra: boolean;
}

export interface OverPoint {
  over: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  balls: OverBall[];
  isMilestone: boolean;
  milestoneLabel?: string;
}

export interface OverChartData {
  overs: OverPoint[];
  totalRuns: number;
  averageRunsPerOver: number;
  highestOver: number | null;
  lowestOver: number | null;
}

export function ballLabel(event: BallEvent): OverBall {
  if (event.isWicket) return { label: 'W', runs: event.runsBatter + event.runsExtra, isWicket: true, isExtra: false };
  if (event.extraType === 'wide') return { label: 'WD', runs: event.runsExtra, isWicket: false, isExtra: true };
  if (event.extraType === 'no_ball') return { label: 'NB', runs: event.runsBatter + event.runsExtra, isWicket: false, isExtra: true };
  if (event.extraType === 'bye') return { label: 'B', runs: event.runsExtra, isWicket: false, isExtra: true };
  if (event.extraType === 'leg_bye') return { label: 'LB', runs: event.runsExtra, isWicket: false, isExtra: true };
  if (event.runsBatter === 0) return { label: '•', runs: 0, isWicket: false, isExtra: false };
  return { label: String(event.runsBatter), runs: event.runsBatter, isWicket: false, isExtra: false };
}

export function computeOverChartData(events: BallEvent[], oversPerInnings: number): OverChartData {
  const byOver = new Map<number, BallEvent[]>();
  for (const event of events) {
    const list = byOver.get(event.overNumber) ?? [];
    list.push(event);
    byOver.set(event.overNumber, list);
  }

  const overs: OverPoint[] = [];
  for (let i = 0; i < oversPerInnings; i++) {
    const balls = (byOver.get(i) ?? [])
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map(ballLabel);
    const runs = balls.reduce((sum, b) => sum + b.runs, 0);
    const wickets = balls.filter((b) => b.isWicket).length;
    const legalBalls = (byOver.get(i) ?? []).filter((e) => e.isLegalDelivery).length;
    overs.push({ over: i + 1, runs, wickets, legalBalls, balls, isMilestone: false });
  }

  const played = overs.filter((o) => o.runs > 0 || o.legalBalls > 0);
  const totalRuns = overs.reduce((sum, o) => sum + o.runs, 0);
  const totalOversPlayed = played.length;
  const averageRunsPerOver = totalOversPlayed > 0 ? Number((totalRuns / totalOversPlayed).toFixed(1)) : 0;

  let highestOver: number | null = null;
  let lowestOver: number | null = null;
  let highestRuns = -1;
  let lowestRuns = Infinity;
  for (const o of played) {
    if (o.runs > highestRuns) {
      highestRuns = o.runs;
      highestOver = o.over;
    }
    if (o.runs > 0 && o.runs < lowestRuns) {
      lowestRuns = o.runs;
      lowestOver = o.over;
    }
  }

  for (const o of overs) {
    if (o.over === highestOver) {
      o.isMilestone = true;
      o.milestoneLabel = 'Highest';
    } else if (o.over === lowestOver && lowestRuns > 0) {
      o.isMilestone = true;
      o.milestoneLabel = 'Lowest';
    } else if (o.runs === 0 && o.legalBalls > 0) {
      o.isMilestone = true;
      o.milestoneLabel = 'Maiden';
    } else if (o.runs >= 8 && averageRunsPerOver > 0 && o.runs >= averageRunsPerOver * 1.6) {
      o.isMilestone = true;
      o.milestoneLabel = 'Surge';
    }
  }

  return { overs, totalRuns, averageRunsPerOver, highestOver, lowestOver };
}

export interface Partnership {
  runs: number;
  balls: number;
  b1: string;
  b2: string;
}

export function computeHighestPartnership(events: BallEvent[]): Partnership | null {
  if (events.length === 0) return null;
  const ordered = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const first = ordered[0];

  let striker = first.strikerId;
  let nonStriker = first.nonStrikerId;
  let pairRuns = 0;
  let pairBalls = 0;
  const bestHolder: { value: Partnership | null } = { value: null };

  const pushBest = () => {
    const current = bestHolder.value;
    if (!current || pairRuns > current.runs) {
      bestHolder.value = { runs: pairRuns, balls: pairBalls, b1: striker, b2: nonStriker };
    }
  };

  for (const event of ordered) {
    if (striker === null || nonStriker === null) break;

    if (event.strikerId !== striker && event.strikerId !== nonStriker) {
      striker = event.strikerId;
    }
    if (event.nonStrikerId !== striker && event.nonStrikerId !== nonStriker) {
      nonStriker = event.nonStrikerId;
    }
    if (striker === null || nonStriker === null) break;

    const isLegal = event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball';
    if (event.extraType !== 'bye' && event.extraType !== 'leg_bye') {
      pairBalls += isLegal ? 1 : 0;
    }
    pairRuns += event.runsBatter + event.runsExtra;

    if (event.isWicket) {
      pushBest();
      pairRuns = 0;
      pairBalls = 0;
    }

    const oddRotation = event.extraType === 'bye' || event.extraType === 'leg_bye'
      ? event.runsExtra % 2 === 1
      : event.runsBatter % 2 === 1;
    if (oddRotation) {
      [striker, nonStriker] = [nonStriker, striker];
    }
  }
  pushBest();

  const best = bestHolder.value;
  if (!best || best.runs === 0) return null;
  return best;
}

export interface RunDistribution {
  singles: number;
  twos: number;
  threes: number;
  fours: number;
  sixes: number;
  extras: number;
  dots: number;
  boundaries: number;
  totalRuns: number;
  boundaryRunPct: number;
  dotBallPct: number;
}

export function computeRunDistribution(events: BallEvent[]): RunDistribution {
  let singles = 0;
  let twos = 0;
  let threes = 0;
  let fours = 0;
  let sixes = 0;
  let extras = 0;
  let dots = 0;
  let legalBalls = 0;

  for (const event of events) {
    const isLegal = event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball';
    if (isLegal) {
      legalBalls += 1;
      if (event.runsBatter === 0 && event.runsExtra === 0 && !event.isWicket) dots += 1;
    }
    if (event.extraType) {
      extras += event.runsExtra;
      if (event.runsBatter === 0 && event.runsExtra === 0 && event.extraType === 'bye') extras += 0;
    }
    switch (event.runsBatter) {
      case 1: singles += 1; break;
      case 2: twos += 1; break;
      case 3: threes += 1; break;
      case 4: fours += 1; break;
      case 6: sixes += 1; break;
      default: break;
    }
  }

  const boundaries = fours + sixes;
  const totalRuns = events.reduce((sum, e) => sum + e.runsBatter + e.runsExtra, 0);
  const boundaryRuns = fours * 4 + sixes * 6;
  const boundaryRunPct = totalRuns > 0 ? Math.round((boundaryRuns / totalRuns) * 100) : 0;
  const dotBallPct = legalBalls > 0 ? Math.round((dots / legalBalls) * 100) : 0;

  return { singles, twos, threes, fours, sixes, extras, dots, boundaries, totalRuns, boundaryRunPct, dotBallPct };
}

export function computeDismissalTypes(events: BallEvent[]): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.isWicket && event.wicketType) {
      counts.set(event.wicketType, (counts.get(event.wicketType) ?? 0) + 1);
    }
  }
  const labels: Record<string, string> = {
    bowled: 'Bowled',
    caught: 'Caught',
    lbw: 'LBW',
    stumped: 'Stumped',
    run_out: 'Run Out',
    hit_wicket: 'Hit Wicket'
  };
  return [...counts.entries()]
    .map(([type, count]) => ({ type: labels[type] ?? type, count }))
    .sort((a, b) => b.count - a.count);
}

export interface BowlingSpell {
  bowlerId: string;
  wickets: number;
  runsConceded: number;
  balls: number;
  maidens: number;
}

export function computeBestBowlingSpell(events: BallEvent[]): BowlingSpell | null {
  const byBowler = new Map<string, BowlingSpell>();
  for (const event of events) {
    if (event.extraType === 'wide' || event.extraType === 'no_ball') continue;
    const spell = byBowler.get(event.bowlerId) ?? { bowlerId: event.bowlerId, wickets: 0, runsConceded: 0, balls: 0, maidens: 0 };
    spell.balls += 1;
    spell.runsConceded += event.runsBatter + (event.extraType === 'bye' || event.extraType === 'leg_bye' ? 0 : event.runsExtra);
    if (event.isWicket && event.wicketType && ['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'].includes(event.wicketType)) {
      spell.wickets += 1;
    }
    byBowler.set(event.bowlerId, spell);
  }
  const spells = [...byBowler.values()].filter((s) => s.balls > 0);
  if (spells.length === 0) return null;
  spells.sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded || a.balls - b.balls);
  return spells[0];
}

export interface ExpensiveOver {
  over: number;
  runs: number;
  wickets: number;
  bowlerIds: string[];
}

export function computeMostExpensiveOver(events: BallEvent[]): ExpensiveOver | null {
  const byOver = new Map<number, ExpensiveOver>();
  for (const event of events) {
    const entry = byOver.get(event.overNumber) ?? { over: event.overNumber, runs: 0, wickets: 0, bowlerIds: [] };
    entry.runs += event.runsBatter + event.runsExtra;
    if (event.isWicket) entry.wickets += 1;
    if (!entry.bowlerIds.includes(event.bowlerId)) entry.bowlerIds.push(event.bowlerId);
    byOver.set(event.overNumber, entry);
  }
  const overs = [...byOver.values()].sort((a, b) => b.runs - a.runs);
  return overs[0] ? { ...overs[0], over: overs[0].over + 1 } : null;
}

export interface ImpactBreakdown {
  batting: number;
  bowling: number;
  fielding: number;
  pressure: number;
}

export interface ImpactCandidate {
  playerId: string;
  name: string;
  total: number;
  breakdown: ImpactBreakdown;
  reason: string;
  battingLabel: string | null;
  bowlingLabel: string | null;
  fieldingLabel: string | null;
}

export interface ImpactParams {
  match: Match;
  innings1Stats: DerivedInningsState | null;
  innings2Stats: DerivedInningsState | null;
  ballEvents1: BallEvent[];
  ballEvents2: BallEvent[];
  playerMap: Map<string, string>;
}

function teamBattingSide(inningsNumber: number, match: Match): 'team_a' | 'team_b' {
  const battingFirst = match.batting_first;
  if (inningsNumber === 1) return battingFirst === 'team_b' ? 'team_b' : 'team_a';
  return battingFirst === 'team_b' ? 'team_a' : 'team_b';
}

export function computeMatchImpactScore(params: ImpactParams): ImpactCandidate[] {
  const { match, innings1Stats, innings2Stats, ballEvents1, ballEvents2, playerMap } = params;
  const candidates = new Map<string, ImpactCandidate>();

  const addBatting = (stats: DerivedInningsState | null, inningsNumber: number) => {
    if (!stats) return;
    for (const [playerId, b] of Object.entries(stats.battingStats)) {
      if (b.balls === 0 && b.runs === 0) continue;
      const sr = b.balls > 0 ? (b.runs / b.balls) * 100 : 0;
      let score = b.runs * 1.0 + b.fours * 0.3 + b.sixes * 0.5 + Math.max(0, sr - 100) * 0.15;
      if (inningsNumber === 2 && match.status === 'completed' && match.winner === teamBattingSide(2, match)) {
        score *= 1.15;
      }
      const entry = candidates.get(playerId) ?? { playerId, name: playerMap.get(playerId) ?? 'Player', total: 0, breakdown: { batting: 0, bowling: 0, fielding: 0, pressure: 0 }, reason: '', battingLabel: null, bowlingLabel: null, fieldingLabel: null };
      entry.breakdown.batting += score;
      entry.battingLabel = `${b.runs} runs from ${b.balls} balls (SR ${Math.round(sr)})`;
      candidates.set(playerId, entry);
    }
  };

  const addBowling = (stats: DerivedInningsState | null, inningsNumber: number, events: BallEvent[]) => {
    if (!stats) return;
    for (const [playerId, b] of Object.entries(stats.bowlingStats)) {
      if (b.balls === 0) continue;
      const dots = events.filter((e) => e.bowlerId === playerId && e.isLegalDelivery && e.runsBatter === 0 && e.runsExtra === 0 && e.extraType !== 'bye' && e.extraType !== 'leg_bye').length;
      let score = b.wickets * 18 + b.maidens * 5 + Math.max(0, 12 - b.economy) * 1.2 + dots * 0.2;
      if (inningsNumber === 2 && match.status === 'completed' && match.winner !== teamBattingSide(2, match)) {
        score += b.wickets * 4;
      }
      const entry = candidates.get(playerId) ?? { playerId, name: playerMap.get(playerId) ?? 'Player', total: 0, breakdown: { batting: 0, bowling: 0, fielding: 0, pressure: 0 }, reason: '', battingLabel: null, bowlingLabel: null, fieldingLabel: null };
      entry.breakdown.bowling += score;
      entry.bowlingLabel = `${b.wickets} wickets for ${b.runsConceded} runs in ${b.oversDisplay} overs`;
      candidates.set(playerId, entry);
    }
  };

  const addFielding = (events: BallEvent[]) => {
    const counts = new Map<string, { catches: number; runOuts: number; stumpings: number }>();
    for (const event of events) {
      if (!event.isWicket || !event.fielderId) continue;
      const c = counts.get(event.fielderId) ?? { catches: 0, runOuts: 0, stumpings: 0 };
      if (event.wicketType === 'caught') c.catches += 1;
      if (event.wicketType === 'run_out') c.runOuts += 1;
      if (event.wicketType === 'stumped') c.stumpings += 1;
      counts.set(event.fielderId, c);
    }
    for (const [playerId, c] of counts) {
      const total = c.catches * 8 + c.runOuts * 12 + c.stumpings * 10;
      if (total === 0) continue;
      const entry = candidates.get(playerId) ?? { playerId, name: playerMap.get(playerId) ?? 'Player', total: 0, breakdown: { batting: 0, bowling: 0, fielding: 0, pressure: 0 }, reason: '', battingLabel: null, bowlingLabel: null, fieldingLabel: null };
      entry.breakdown.fielding += total;
      const parts: string[] = [];
      if (c.catches > 0) parts.push(`${c.catches} ${c.catches === 1 ? 'catch' : 'catches'}`);
      if (c.runOuts > 0) parts.push(`${c.runOuts} run out${c.runOuts === 1 ? '' : 's'}`);
      if (c.stumpings > 0) parts.push(`${c.stumpings} stumping${c.stumpings === 1 ? '' : 's'}`);
      entry.fieldingLabel = parts.join(', ');
      candidates.set(playerId, entry);
    }
  };

  addBatting(innings1Stats, 1);
  addBatting(innings2Stats, 2);
  addBowling(innings1Stats, 1, ballEvents1);
  addBowling(innings2Stats, 2, ballEvents2);
  addFielding(ballEvents1);
  addFielding(ballEvents2);

  const chaserWon = match.status === 'completed' && match.winner === teamBattingSide(2, match);
  for (const entry of candidates.values()) {
    if (chaserWon && entry.breakdown.batting > 0) {
      const chased = innings2Stats?.battingStats[entry.playerId];
      if (chased && chased.balls > 0 && (chased.runs / chased.balls) * 100 > 120) {
        entry.breakdown.pressure += 5;
      }
    }
    entry.total = Math.round(entry.breakdown.batting + entry.breakdown.bowling + entry.breakdown.fielding + entry.breakdown.pressure);
  }

  const list = [...candidates.values()].sort((a, b) => b.total - a.total);
  for (const entry of list) {
    entry.reason = buildImpactReason(entry, chaserWon, innings2Stats);
  }

  return list;
}

function buildImpactReason(entry: ImpactCandidate, chaserWon: boolean, innings2Stats: DerivedInningsState | null): string {
  const { breakdown, battingLabel, bowlingLabel, fieldingLabel } = entry;
  const parts: string[] = [];

  if (breakdown.batting > 0 && battingLabel) {
    let text = battingLabel;
    const chased = innings2Stats?.battingStats[entry.playerId];
    if (chaserWon && chased && chased.runs > 0) text += ' in a successful chase';
    parts.push(text);
  }
  if (breakdown.bowling > 0 && bowlingLabel) parts.push(bowlingLabel);
  if (breakdown.fielding > 0 && fieldingLabel) parts.push(`and ${fieldingLabel}`);

  if (parts.length === 0) return 'balanced contribution across the match';
  if (breakdown.batting > 0 && breakdown.bowling > 0) return `${parts.join(', ')} — an all-round performance`;
  return parts.join(', ');
}

export interface WinProbPoint {
  label: string;
  probability: number;
}

export function computeWinProbabilityTimeline(events: BallEvent[], targetRuns: number, totalOvers: number, playersPerTeam: number): WinProbPoint[] {
  if (events.length === 0 || targetRuns <= 0) return [];
  const ordered = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const points: WinProbPoint[] = [];
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let lastRecordedBalls = 0;

  const record = (label: string) => {
    const oversUsed = Math.floor(legalBalls / 6) + ((legalBalls % 6) / 10);
    points.push({
      label,
      probability: computeWinProbabilityForChase(targetRuns, runs, wickets, playersPerTeam, oversUsed, totalOvers)
    });
  };

  record('Start');
  for (const event of ordered) {
    runs += event.runsBatter + event.runsExtra;
    if (event.isWicket) wickets += 1;
    if (event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball') {
      legalBalls += 1;
      if (legalBalls % 6 === 0 && legalBalls !== lastRecordedBalls) {
        lastRecordedBalls = legalBalls;
        record(`Over ${legalBalls / 6}`);
      }
    }
  }
  const finalBalls = legalBalls;
  if (finalBalls % 6 !== 0 && finalBalls !== lastRecordedBalls) {
    const oversUsed = Math.floor(finalBalls / 6) + ((finalBalls % 6) / 10);
    points.push({ label: `End (${Math.floor(finalBalls / 6)}.${finalBalls % 6})`, probability: computeWinProbabilityForChase(targetRuns, runs, wickets, playersPerTeam, oversUsed, totalOvers) });
  }
  return points;
}

export function computeWinProbabilityForChase(targetRuns: number, currentRuns: number, wicketsLost: number, totalWickets: number, oversUsed: number, totalOvers: number): number {
  const runsNeeded = targetRuns - currentRuns;
  if (runsNeeded <= 0) return 100;
  const totalBalls = totalOvers * 6;
  const ballsUsed = Math.floor(oversUsed) * 6 + Math.round((oversUsed % 1) * 10);
  const ballsRemaining = totalBalls - ballsUsed;
  if (ballsRemaining <= 0 || wicketsLost >= totalWickets) return 0;
  if (currentRuns <= 0 && ballsUsed <= 0) {
    const wicketFactor = Math.max(0, 1 - wicketsLost / totalWickets);
    return Math.round(40 + wicketFactor * 20);
  }
  const crr = ballsUsed > 0 ? (currentRuns * 6) / ballsUsed : 0;
  const rrr = ballsRemaining > 0 ? (runsNeeded * 6) / ballsRemaining : 999;
  const runFactor = rrr > 0 ? Math.max(0, Math.min(1, crr / rrr)) : 1;
  const wicketFactor = Math.max(0, 1 - wicketsLost / totalWickets);
  const ballFactor = Math.min(1, ballsRemaining / totalBalls);
  return Math.round(Math.max(0, Math.min(100, (runFactor * 0.5 + wicketFactor * 0.3 + ballFactor * 0.2) * 100)));
}

export function computeTurningPoint(
  ballEvents2: BallEvent[],
  targetRuns: number,
  totalOvers: number,
  playersPerTeam: number,
  innings1State: DerivedInningsState | null
): string | null {
  if (ballEvents2.length === 0) return null;
  const ordered = [...ballEvents2].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const timeline = computeWinProbabilityTimeline(ordered, targetRuns, totalOvers, playersPerTeam);
  let maxSwing = 0;
  let swingLabel: string | null = null;
  for (let i = 1; i < timeline.length; i++) {
    const swing = Math.abs(timeline[i].probability - timeline[i - 1].probability);
    if (swing > maxSwing) {
      maxSwing = swing;
      swingLabel = `${timeline[i - 1].label} → ${timeline[i].label}`;
    }
  }
  if (!swingLabel || maxSwing < 10) {
    if (!innings1State) return null;
    return `Highest momentum came in the 1st innings with ${innings1State.totalRuns} runs scored.`;
  }
  const direction = maxSwing >= 10 ? (swingLabel.includes('→') ? 'shifted' : 'moved') : '';
  return `The chase flipped momentum around ${swingLabel}, swinging the win probability by ${Math.round(maxSwing)}%.`;
}

export interface BowlingFigures {
  playerId: string;
  wickets: number;
  runsConceded: number;
  balls: number;
  matchId: string;
}

export function computeBestBowlingFigures(events: BallEvent[]): BowlingFigures | null {
  const figures = new Map<string, BowlingFigures>();
  for (const event of events) {
    if (event.extraType === 'wide' || event.extraType === 'no_ball') continue;
    const key = `${event.inningsId}:${event.bowlerId}`;
    const f = figures.get(key) ?? {
      playerId: event.bowlerId,
      wickets: 0,
      runsConceded: 0,
      balls: 0,
      matchId: event.matchId
    };
    f.balls += 1;
    f.runsConceded += event.runsBatter + (event.extraType === 'bye' || event.extraType === 'leg_bye' ? 0 : event.runsExtra);
    if (event.isWicket && event.wicketType && ['bowled', 'caught', 'lbw', 'stumped', 'hit_wicket'].includes(event.wicketType)) {
      f.wickets += 1;
    }
    figures.set(key, f);
  }
  const list = [...figures.values()].filter((f) => f.balls > 0);
  if (list.length === 0) return null;
  list.sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded || a.balls - b.balls);
  return list[0];
}

export interface FastestFifty {
  playerId: string;
  balls: number;
  inningsId: string;
  matchId: string;
}

export function computeFastestFifty(events: BallEvent[]): FastestFifty | null {
  const ordered = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const batting = new Map<string, { runs: number; balls: number }>();
  let best: FastestFifty | null = null;

  for (const event of ordered) {
    const isLegal = event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball';
    const b = batting.get(event.strikerId) ?? { runs: 0, balls: 0 };
    b.runs += event.runsBatter;
    if (isLegal) b.balls += 1;
    batting.set(event.strikerId, b);
    if (b.runs >= 50 && (!best || b.balls < best.balls)) {
      best = { playerId: event.strikerId, balls: b.balls, inningsId: event.inningsId, matchId: event.matchId };
    }
  }
  return best;
}

export interface ChaseRecord {
  match: Match;
  chaseRuns: number;
  target: number;
  chaserName: string;
  ballsUsed: number;
}

export function computeLargestSuccessfulChase(
  matches: Match[],
  innings: Pick<MatchInningsLike, 'id' | 'match_id' | 'innings_number' | 'batting_team'>[],
  inningsRuns: Map<string, number>,
  inningsBalls: Map<string, number>
): ChaseRecord | null {
  let best: ChaseRecord | null = null;
  for (const match of matches) {
    if (match.status !== 'completed' || !match.winner || !match.batting_first) continue;
    const inns = innings.filter((i) => i.match_id === match.id);
    const inns1 = inns.find((i) => i.innings_number === 1);
    const inns2 = inns.find((i) => i.innings_number === 2);
    if (!inns1 || !inns2) continue;
    const target = inningsRuns.get(inns1.id) ?? 0;
    const chaseRuns = inningsRuns.get(inns2.id) ?? 0;
    if (target === 0 || chaseRuns < target) continue;
    if (match.winner !== inns2.batting_team) continue;
    if (!best || chaseRuns > best.chaseRuns || (chaseRuns === best.chaseRuns && target > best.target)) {
      best = {
        match,
        chaseRuns,
        target,
        chaserName: inns2.batting_team === 'team_a' ? match.team_a_name : match.team_b_name,
        ballsUsed: inningsBalls.get(inns2.id) ?? 0
      };
    }
  }
  return best;
}

export function computeLowestTotalDefended(
  matches: Match[],
  innings: Pick<MatchInningsLike, 'id' | 'match_id' | 'innings_number' | 'batting_team'>[],
  inningsRuns: Map<string, number>
): { match: Match; total: number; defenderName: string; target: number } | null {
  let best: { match: Match; total: number; defenderName: string; target: number } | null = null;
  for (const match of matches) {
    if (match.status !== 'completed' || !match.winner || !match.batting_first) continue;
    const inns = innings.filter((i) => i.match_id === match.id);
    const inns1 = inns.find((i) => i.innings_number === 1);
    const inns2 = inns.find((i) => i.innings_number === 2);
    if (!inns1 || !inns2) continue;
    const total = inningsRuns.get(inns1.id) ?? 0;
    if (total === 0) continue;
    if (match.winner !== inns1.batting_team) continue;
    if (!best || total < best.total) {
      best = {
        match,
        total,
        defenderName: inns1.batting_team === 'team_a' ? match.team_a_name : match.team_b_name,
        target: inningsRuns.get(inns2.id) ?? 0
      };
    }
  }
  return best;
}

export function computeMostConsecutiveWins(matches: Match[]): { teamName: string; streak: number } | null {
  const completed = matches
    .filter((m) => m.status === 'completed' && m.winner)
    .sort((a, b) => a.match_date.localeCompare(b.match_date));

  let bestStreak = 0;
  let bestTeam = '';
  let currentTeam = '';
  let currentStreak = 0;

  for (const match of completed) {
    const winnerName = match.winner === 'team_a' ? match.team_a_name : match.team_b_name;
    if (winnerName === currentTeam) {
      currentStreak += 1;
    } else {
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
        bestTeam = currentTeam;
      }
      currentTeam = winnerName;
      currentStreak = 1;
    }
  }
  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
    bestTeam = currentTeam;
  }
  if (bestStreak < 2) return null;
  return { teamName: bestTeam, streak: bestStreak };
}

type MatchInningsLike = {
  id: string;
  match_id: string;
  innings_number: number;
  batting_team: 'team_a' | 'team_b';
};
