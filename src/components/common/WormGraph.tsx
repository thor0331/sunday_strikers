import { useMemo, useId, type ReactNode, type ReactElement } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { BallEvent } from '../../types/models';
import { GlassCard } from './GlassCard';
import { Waves, Zap, Activity, Link2, TrendingUp } from 'lucide-react';
import {
  computeOverChartData,
  computeMostExpensiveOver,
  computeBestBowlingSpell,
  computeHighestPartnership,
  type BowlingSpell,
  type Partnership,
  type ExpensiveOver,
} from '../../utils/matchAnalytics';

const TEAM1_COLOR = '#22d3ee';
const TEAM2_COLOR = '#4ade80';

export interface WormGraphProps {
  team1Name: string;
  team2Name: string;
  ballEvents1: BallEvent[];
  ballEvents2: BallEvent[];
  targetRuns: number | null;
  totalOvers: number;
  playerMap?: Map<string, string>;
}

interface InningsPoint {
  ball: number;
  overLabel: string;
  runs: number;
  wickets: number;
  runRate: number;
  required: number | null;
  ballsRemaining: number | null;
  wicket: boolean;
  p50: boolean;
  p100: boolean;
  targetReached: boolean;
  isEnd: boolean;
  highestOver: boolean;
}

interface WormDatum {
  ball: number;
  t1runs: number | null;
  t1wickets: number | null;
  t1rr: number | null;
  t1over: string | null;
  t1required: number | null;
  t1ballsLeft: number | null;
  t1Wicket: boolean;
  t1_50: boolean;
  t1_100: boolean;
  t1Target: boolean;
  t1End: boolean;
  t1Highest: boolean;
  t2runs: number | null;
  t2wickets: number | null;
  t2rr: number | null;
  t2over: string | null;
  t2required: number | null;
  t2ballsLeft: number | null;
  t2Wicket: boolean;
  t2_50: boolean;
  t2_100: boolean;
  t2Target: boolean;
  t2End: boolean;
  t2Highest: boolean;
}

function buildSeries(events: BallEvent[], totalOvers: number, chaseTarget: number | null): InningsPoint[] {
  if (events.length === 0) return [];
  const ordered = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  const points: InningsPoint[] = [];
  const perOver = new Map<number, { runs: number; balls: number }>();
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let partnership = 0;
  let crossed50 = false;
  let crossed100 = false;
  let targetReached = false;

  for (const event of ordered) {
    const ballRuns = event.runsBatter + event.runsExtra;
    runs += ballRuns;
    partnership += ballRuns;

    const isLegal = event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball';
    const wicket = event.isWicket;
    if (wicket) wickets += 1;

    const overIdx = Math.floor(legalBalls / 6);
    const over = perOver.get(overIdx) ?? { runs: 0, balls: 0 };
    over.runs += ballRuns;
    over.balls += isLegal ? 1 : 0;
    perOver.set(overIdx, over);

    const p50 = !crossed50 && partnership >= 50;
    const p100 = !crossed100 && partnership >= 100;
    if (p50) crossed50 = true;
    if (p100) crossed100 = true;

    if (!targetReached && chaseTarget != null && runs >= chaseTarget) targetReached = true;

    if (isLegal) legalBalls += 1;

    const overLabel = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
    const runRate = legalBalls > 0 ? Number((runs / (legalBalls / 6)).toFixed(2)) : 0;
    const required = chaseTarget != null ? Math.max(chaseTarget - runs, 0) : null;
    const ballsRemaining = chaseTarget != null ? Math.max(totalOvers * 6 - legalBalls, 0) : null;

    points.push({
      ball: legalBalls,
      overLabel,
      runs,
      wickets,
      runRate,
      required,
      ballsRemaining,
      wicket,
      p50,
      p100,
      targetReached,
      isEnd: false,
      highestOver: false,
    });

    // A wicket ends the current partnership — the runs scored off the
    // wicket delivery still belong to the pair that has just been broken.
    if (wicket) partnership = 0;
  }

  if (points.length > 0) points[points.length - 1].isEnd = true;

  let bestOverIdx: number | null = null;
  let bestRuns = -1;
  for (const [idx, over] of perOver.entries()) {
    if (over.balls > 0 && over.runs > bestRuns) {
      bestRuns = over.runs;
      bestOverIdx = idx;
    }
  }
  if (bestOverIdx != null) {
    for (let i = points.length - 1; i >= 0; i--) {
      if (Math.floor(points[i].ball / 6) === bestOverIdx) {
        points[i].highestOver = true;
        break;
      }
    }
  }

  return points;
}

function originPoint(chaseTarget: number | null): InningsPoint {
  return {
    ball: 0,
    overLabel: '0.0',
    runs: 0,
    wickets: 0,
    runRate: 0,
    required: chaseTarget != null ? chaseTarget : null,
    ballsRemaining: chaseTarget != null ? 0 : null,
    wicket: false,
    p50: false,
    p100: false,
    targetReached: false,
    isEnd: false,
    highestOver: false,
  };
}

function buildChartData(s1: InningsPoint[], s2: InningsPoint[], chaseTarget: number | null): WormDatum[] {
  const map1 = new Map(s1.map((p) => [p.ball, p]));
  const map2 = new Map(s2.map((p) => [p.ball, p]));
  if (s1.length > 0 && !map1.has(0)) map1.set(0, originPoint(null));
  if (s2.length > 0 && !map2.has(0)) map2.set(0, originPoint(chaseTarget));

  const lastBall = Math.max(s1.length ? s1[s1.length - 1].ball : 0, s2.length ? s2[s2.length - 1].ball : 0);
  const rows: WormDatum[] = [];
  for (let b = 0; b <= lastBall; b++) {
    const p1 = map1.get(b);
    const p2 = map2.get(b);
    rows.push({
      ball: b,
      t1runs: p1?.runs ?? null,
      t1wickets: p1?.wickets ?? null,
      t1rr: p1?.runRate ?? null,
      t1over: p1?.overLabel ?? null,
      t1required: p1?.required ?? null,
      t1ballsLeft: p1?.ballsRemaining ?? null,
      t1Wicket: p1?.wicket ?? false,
      t1_50: p1?.p50 ?? false,
      t1_100: p1?.p100 ?? false,
      t1Target: p1?.targetReached ?? false,
      t1End: p1?.isEnd ?? false,
      t1Highest: p1?.highestOver ?? false,
      t2runs: p2?.runs ?? null,
      t2wickets: p2?.wickets ?? null,
      t2rr: p2?.runRate ?? null,
      t2over: p2?.overLabel ?? null,
      t2required: p2?.required ?? null,
      t2ballsLeft: p2?.ballsRemaining ?? null,
      t2Wicket: p2?.wicket ?? false,
      t2_50: p2?.p50 ?? false,
      t2_100: p2?.p100 ?? false,
      t2Target: p2?.targetReached ?? false,
      t2End: p2?.isEnd ?? false,
      t2Highest: p2?.highestOver ?? false,
    });
  }
  return rows;
}

function bestOverBurst(events: BallEvent[], totalOvers: number): { start: number; end: number; runs: number } | null {
  const { overs } = computeOverChartData(events, totalOvers);
  const played = overs.filter((o) => o.legalBalls > 0);
  if (played.length < 3) return null;
  let best: { start: number; end: number; runs: number } | null = null;
  for (let i = 0; i + 2 < played.length; i++) {
    const runs = played[i].runs + played[i + 1].runs + played[i + 2].runs;
    if (!best || runs > best.runs) best = { start: played[i].over, end: played[i + 2].over, runs };
  }
  return best;
}

function phaseNarrative(events: BallEvent[], totalOvers: number): { type: 'accelerate' | 'slow'; over: number } | null {
  const { overs } = computeOverChartData(events, totalOvers);
  const played = overs.filter((o) => o.legalBalls > 0);
  if (played.length < 4) return null;
  const half = Math.floor(played.length / 2);
  const first = played.slice(0, half);
  const second = played.slice(half);
  const avg = (list: typeof played) => (list.length > 0 ? list.reduce((s, o) => s + o.runs, 0) / list.length : 0);
  const f = avg(first);
  const s = avg(second);
  if (s >= f * 1.2 && s > 0) return { type: 'accelerate', over: played[half].over };
  if (f >= s * 1.2 && f > 0) return { type: 'slow', over: played[half].over };
  return null;
}

function pickBest<T>(items: (T | null)[], score: (item: T) => number): T | null {
  let best: T | null = null;
  for (const item of items) {
    if (item == null) continue;
    if (best == null || score(item) > score(best)) best = item;
  }
  return best;
}

function formatOversFromBalls(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function WormTooltip({ active, payload, team1Name, team2Name }: {
  active?: boolean;
  payload?: Array<{ payload?: WormDatum }>;
  team1Name: string;
  team2Name: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  const over = datum.t1over ?? datum.t2over ?? '0.0';
  const t1 = datum.t1runs != null
    ? { name: team1Name, color: TEAM1_COLOR, runs: datum.t1runs, wickets: datum.t1wickets ?? 0, rr: datum.t1rr ?? 0, required: datum.t1required, ballsLeft: datum.t1ballsLeft }
    : null;
  const t2 = datum.t2runs != null
    ? { name: team2Name, color: TEAM2_COLOR, runs: datum.t2runs, wickets: datum.t2wickets ?? 0, rr: datum.t2rr ?? 0, required: datum.t2required, ballsLeft: datum.t2ballsLeft }
    : null;

  const rows = [t1, t2].filter((r): r is NonNullable<typeof t1> => r != null);
  if (rows.length === 0) return null;

  const notes = [
    datum.t1Wicket || datum.t2Wicket ? 'Wicket' : null,
    datum.t1_50 || datum.t2_50 ? '50-partnership' : null,
    datum.t1_100 || datum.t2_100 ? '100-partnership' : null,
    datum.t1Target || datum.t2Target ? 'Target reached' : null,
    datum.t1Highest || datum.t2Highest ? 'Highest scoring over' : null,
  ].filter((n): n is string => n != null);

  return (
    <div className="chart-tooltip px-3 py-2.5 min-w-[11rem]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
          {over === '0.0' ? 'Start' : `Over ${over}`}
        </p>
        {notes.length > 0 && <p className="text-[9px] font-bold text-amber-300 text-right">{notes.join(' · ')}</p>}
      </div>
      <div className="mt-1.5 space-y-1.5 text-xs">
        {rows.map((r) => (
          <div key={r.name} className="rounded-lg bg-white/[0.04] px-2 py-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200 min-w-0">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="truncate">{r.name}</span>
              </span>
              <span className="font-bold text-slate-100 tabular-nums">{r.runs}/{r.wickets}</span>
            </div>
            <div className="flex items-center justify-between gap-4 mt-0.5 text-[11px]">
              <span className="text-slate-400">Run Rate</span>
              <span className="font-bold text-slate-200 tabular-nums">{r.rr.toFixed(2)}</span>
            </div>
            {r.required != null && r.ballsLeft != null && (
              <div className="flex items-center justify-between gap-4 mt-0.5 text-[11px]">
                <span className="text-slate-400">Required</span>
                <span className="font-bold text-amber-300 tabular-nums">{r.required} from {r.ballsLeft}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface WormDotProps {
  cx?: number;
  cy?: number;
  payload?: WormDatum;
}

interface MilestoneFlags {
  wicket: boolean;
  p50: boolean;
  p100: boolean;
  target: boolean;
  end: boolean;
  highest: boolean;
}

function milestoneDot(cx: number, cy: number, f: MilestoneFlags, color: string): ReactElement {
  if (f.target) {
    return (
      <path
        d={`M${cx} ${cy - 6} L${cx + 2} ${cy - 2} L${cx + 6} ${cy} L${cx + 2} ${cy + 2} L${cx} ${cy + 6} L${cx - 2} ${cy + 2} L${cx - 6} ${cy} L${cx - 2} ${cy - 2} Z`}
        fill="#fde047"
        stroke="#713f12"
        strokeWidth={1}
      />
    );
  }
  if (f.wicket) {
    return <circle cx={cx} cy={cy} r={4.5} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1.5} />;
  }
  if (f.p100) {
    return <path d={`M${cx} ${cy - 5} L${cx + 3.5} ${cy} L${cx} ${cy + 5} L${cx - 3.5} ${cy} Z`} fill="#fbbf24" stroke="#78350f" strokeWidth={1} />;
  }
  if (f.p50) {
    return <path d={`M${cx} ${cy - 4} L${cx + 3} ${cy} L${cx} ${cy + 4} L${cx - 3} ${cy} Z`} fill="#34d399" stroke="#064e3b" strokeWidth={1} />;
  }
  if (f.highest) {
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />;
  }
  if (f.end) {
    return <circle cx={cx} cy={cy} r={5} fill="none" stroke="#e2e8f0" strokeWidth={1.5} />;
  }
  return <circle cx={cx} cy={cy} r={0} fill="transparent" />;
}

function makeDot(side: 't1' | 't2', color: string) {
  return (props: WormDotProps): ReactElement => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload) return <circle cx={0} cy={0} r={0} fill="transparent" />;
    const flags: MilestoneFlags = side === 't1'
      ? {
          wicket: payload.t1Wicket,
          p50: payload.t1_50,
          p100: payload.t1_100,
          target: payload.t1Target,
          end: payload.t1End,
          highest: payload.t1Highest,
        }
      : {
          wicket: payload.t2Wicket,
          p50: payload.t2_50,
          p100: payload.t2_100,
          target: payload.t2Target,
          end: payload.t2End,
          highest: payload.t2Highest,
        };
    return milestoneDot(cx, cy, flags, color);
  };
}

function InsightCard({ icon, iconBg, label, value, sub }: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 min-w-0">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border ${iconBg} mb-2 shadow-sm`}>{icon}</div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-100 mt-0.5 truncate tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export function WormGraph({ team1Name, team2Name, ballEvents1, ballEvents2, targetRuns, totalOvers, playerMap }: WormGraphProps) {
  const gradientId = useId();
  const gradientId2 = useId();

  const series1 = useMemo(() => buildSeries(ballEvents1, totalOvers, null), [ballEvents1, totalOvers]);
  const series2 = useMemo(() => buildSeries(ballEvents2, totalOvers, targetRuns), [ballEvents2, totalOvers, targetRuns]);
  const data = useMemo(() => buildChartData(series1, series2, targetRuns), [series1, series2, targetRuns]);

  const insights = useMemo(() => {
    const highestOver = pickBest(
      [computeMostExpensiveOver(ballEvents1), computeMostExpensiveOver(ballEvents2)],
      (o: ExpensiveOver) => o.runs
    );
    const spells = [computeBestBowlingSpell(ballEvents1), computeBestBowlingSpell(ballEvents2)]
      .filter((s): s is BowlingSpell => s != null)
      .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);
    const bestSpell = spells[0] ?? null;
    const bestPartnership = pickBest(
      [computeHighestPartnership(ballEvents1), computeHighestPartnership(ballEvents2)],
      (p: Partnership) => p.runs
    );
    const burst1 = bestOverBurst(ballEvents1, totalOvers);
    const burst2 = bestOverBurst(ballEvents2, totalOvers);
    const bestBurst = pickBest([burst1, burst2], (b) => b.runs);
    const accel2 = phaseNarrative(ballEvents2, totalOvers);

    const narratives: string[] = [];
    if (bestBurst) {
      const isInnings1 = bestBurst === burst1;
      const team = isInnings1 ? team1Name : team2Name;
      narratives.push(`${team} scored ${bestBurst.runs} runs in Overs ${bestBurst.start}–${bestBurst.end}.`);
    }
    if (accel2 && ballEvents2.length > 0) {
      narratives.push(
        accel2.type === 'accelerate'
          ? `${team2Name} accelerated after Over ${accel2.over}.`
          : `${team2Name} lost momentum after Over ${accel2.over}.`
      );
    }
    return { highestOver, bestSpell, bestPartnership, narratives };
  }, [ballEvents1, ballEvents2, totalOvers, team1Name, team2Name]);

  if (data.length === 0) return null;

  const last1 = series1.length > 0 ? series1[series1.length - 1] : null;
  const last2 = series2.length > 0 ? series2[series2.length - 1] : null;
  const maxBall = data[data.length - 1].ball;
  const maxRuns = Math.max(
    ...data.map((d) => Math.max(d.t1runs ?? 0, d.t2runs ?? 0)),
    1
  );
  const niceMax = Math.max(Math.ceil(maxRuns / 10) * 10, 10);
  const overTicks = Array.from({ length: Math.floor(maxBall / 6) + 1 }, (_, i) => i * 6);

  const chasedDown = last2 && targetRuns != null && last2.runs >= targetRuns;

  return (
    <GlassCard variant="light" premium className="p-4 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/20 shrink-0">
            <Waves className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider truncate">Worm Graph — Runs Comparison</p>
            <p className="text-[10px] text-slate-400">Over-by-over cumulative runs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {chasedDown && last2 ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 tabular-nums">
              Target chased in {last2.overLabel}
            </span>
          ) : targetRuns != null ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 tabular-nums">
              Target {targetRuns}
            </span>
          ) : null}
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAM1_COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={TEAM1_COLOR} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={gradientId2} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEAM2_COLOR} stopOpacity={0.32} />
                <stop offset="100%" stopColor={TEAM2_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="ball"
              type="number"
              domain={[0, maxBall]}
              ticks={overTicks}
              tickFormatter={(value: number) => `${value / 6}`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
              tickLine={false}
              label={{ value: 'Overs', position: 'insideBottom', offset: -4, fill: '#94a3b8', fontSize: 10 }}
            />
            <YAxis
              domain={[0, niceMax]}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={38}
              label={{ value: 'Runs', angle: -90, position: 'insideLeft', offset: 12, fill: '#94a3b8', fontSize: 10 }}
            />
            <Tooltip
              content={<WormTooltip team1Name={team1Name} team2Name={team2Name} />}
              cursor={{ stroke: 'rgba(255,255,255,0.22)', strokeDasharray: '4 4' }}
            />
            <Area
              dataKey="t1runs"
              type="monotone"
              stroke={TEAM1_COLOR}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              connectNulls
              isAnimationActive
              animationDuration={1400}
              animationEasing="ease-in-out"
              dot={makeDot('t1', TEAM1_COLOR)}
              activeDot={{ r: 5, fill: TEAM1_COLOR, stroke: '#07111F', strokeWidth: 2 }}
            />
            <Area
              dataKey="t2runs"
              type="monotone"
              stroke={TEAM2_COLOR}
              strokeWidth={2.5}
              fill={`url(#${gradientId2})`}
              connectNulls
              isAnimationActive
              animationDuration={1400}
              animationEasing="ease-in-out"
              dot={makeDot('t2', TEAM2_COLOR)}
              activeDot={{ r: 5, fill: TEAM2_COLOR, stroke: '#07111F', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2 border-t border-white/10">
        <span className="flex items-center gap-1.5 text-[9px] text-slate-400">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: TEAM1_COLOR }} />
          {team1Name}
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-slate-400">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: TEAM2_COLOR }} />
          {team2Name}
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-red-500 shadow shadow-red-500/50" /> Wicket
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="h-2 w-2 rotate-45 rounded-[2px] bg-emerald-400" /> 50
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="h-2 w-2 rotate-45 rounded-[2px] bg-amber-400" /> 100
        </span>
        <span className="flex items-center gap-1 text-[9px] text-slate-400">
          <span className="text-[9px] leading-none text-yellow-300">✦</span> Target
        </span>
        <span className="ml-auto flex items-center gap-1 text-[9px] text-slate-400">
          {last1 && <span className="tabular-nums">{last1.runs}/{last1.wickets}</span>}
          {last1 && last2 && <span className="text-slate-500">·</span>}
          {last2 && <span className="tabular-nums">{last2.runs}/{last2.wickets}</span>}
        </span>
      </div>

      {/* Insights */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <InsightCard
            icon={<Zap className="w-4 h-4" />}
            iconBg="bg-amber-400/10 text-amber-300 border-amber-400/25"
            label="Highest Scoring Over"
            value={insights.highestOver ? `Over ${insights.highestOver.over} — ${insights.highestOver.runs} runs` : '—'}
            sub={insights.highestOver ? `${insights.highestOver.wickets} wicket${insights.highestOver.wickets === 1 ? '' : 's'}` : undefined}
          />
          <InsightCard
            icon={<Activity className="w-4 h-4" />}
            iconBg="bg-cyan-400/10 text-cyan-300 border-cyan-400/25"
            label="Best Bowling Spell"
            value={insights.bestSpell ? `${playerMap?.get(insights.bestSpell.bowlerId) ?? 'Bowler'} ${insights.bestSpell.wickets}/${insights.bestSpell.runsConceded}` : '—'}
            sub={insights.bestSpell ? `${formatOversFromBalls(insights.bestSpell.balls)} overs` : undefined}
          />
          <InsightCard
            icon={<Link2 className="w-4 h-4" />}
            iconBg="bg-emerald-400/10 text-emerald-300 border-emerald-400/25"
            label="Largest Partnership"
            value={insights.bestPartnership ? `${insights.bestPartnership.runs} runs` : '—'}
            sub={insights.bestPartnership ? `${playerMap?.get(insights.bestPartnership.b1) ?? 'Batter'} & ${playerMap?.get(insights.bestPartnership.b2) ?? 'Batter'}` : undefined}
          />
          <InsightCard
            icon={<TrendingUp className="w-4 h-4" />}
            iconBg="bg-violet-400/10 text-violet-300 border-violet-400/25"
            label="Match Momentum"
            value={insights.narratives[0] ?? '—'}
            sub={insights.narratives[1]}
          />
        </div>
      </div>
    </GlassCard>
  );
}
