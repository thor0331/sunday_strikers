import { useMemo } from 'react';
import { memo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { BallEvent } from '../../types/models';
import { GlassCard } from './GlassCard';
import { BarChart3 } from 'lucide-react';
import { computeOverChartData } from '../../utils/matchAnalytics';

interface OverChartProps {
  ballEvents: BallEvent[];
  oversPerInnings: number;
  battingTeamName: string;
  compact?: boolean;
}

interface OverDatum {
  over: number;
  runs: number;
  boundaries: number;
  wickets: number;
  runRate: number | null;
  isCurrent: boolean;
}

export function overBarColor(runs: number): string {
  if (runs >= 16) return '#f59e0b';
  if (runs >= 11) return '#a855f7';
  if (runs >= 7) return '#06b6d4';
  if (runs >= 4) return '#22c55e';
  return '#94a3b8';
}

function buildData(events: BallEvent[], oversPerInnings: number): OverDatum[] {
  const data = computeOverChartData(events, oversPerInnings);
  const lastPlayed = data.overs.reduce((max, o) => (o.balls.length > 0 ? o.over : max), -1);
  return data.overs.map((over) => {
    const boundaries = over.balls.filter((b) => b.runs >= 4).length;
    const runRate = over.legalBalls > 0 ? Number(((over.runs * 6) / over.legalBalls).toFixed(1)) : null;
    return { over: over.over, runs: over.runs, boundaries, wickets: over.wickets, runRate, isCurrent: over.over === lastPlayed };
  });
}

interface OverBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: OverDatum;
}

function OverBarShape(props: OverBarShapeProps) {
  const { x = 0, y = 0, width = 0, height = 0, fill = '#94a3b8', payload } = props;
  const barHeight = Math.max(height, payload && payload.runs > 0 ? 4 : 2);
  const isCurrent = Boolean(payload?.isCurrent);
  const topRadius = Math.min(width / 2, 6);
  const path = `M${x},${y + barHeight} L${x},${y + Math.min(barHeight, 8)} Q${x},${y} ${x + topRadius},${y} L${x + width - topRadius},${y} Q${x + width},${y} ${x + width},${y + Math.min(barHeight, 8)} L${x + width},${y + barHeight} Z`;
  const capPath = `M${x},${y + 6} Q${x},${y} ${x + topRadius},${y} L${x + width - topRadius},${y} Q${x + width},${y} ${x + width},${y + 6} L${x + width},${y + 3} Q${x + width},${y - 2} ${x + width - topRadius},${y - 2} L${x + topRadius},${y - 2} Q${x},${y - 2} ${x},${y + 3} Z`;
  return (
    <g>
      <path
        d={path}
        fill={fill}
        stroke={isCurrent ? 'rgba(255,255,255,0.4)' : 'none'}
        strokeWidth={isCurrent ? 1 : 0}
        style={isCurrent ? { filter: `drop-shadow(0 0 6px ${fill})` } : undefined}
      />
      {barHeight > 8 && <path d={capPath} fill="rgba(255,255,255,0.16)" pointerEvents="none" />}
      {payload && payload.runs > 0 && (
        <text x={x + width / 2} y={y - (payload.wickets > 0 ? 16 : 5)} textAnchor="middle" fill="#e2e8f0" fontSize={9} fontWeight={700}>
          {payload.runs}
        </text>
      )}
      {payload && payload.wickets > 0 && (
        <g>
          {Array.from({ length: payload.wickets }).map((_, w) => (
            <circle
              key={w}
              cx={x + width / 2 - (payload.wickets - 1) * 4 + w * 8}
              cy={y - 7}
              r={3.5}
              fill="#ef4444"
              stroke="#7f1d1d"
              strokeWidth={1}
            />
          ))}
        </g>
      )}
    </g>
  );
}

function OverTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: OverDatum }>; label?: string | number }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="chart-tooltip px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Over {label}</p>
      <div className="mt-1.5 space-y-0.5 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Runs</span>
          <span className="font-bold text-white tabular-nums">{data.runs}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Boundaries</span>
          <span className="font-bold text-cyan-300 tabular-nums">{data.boundaries}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Wickets</span>
          <span className={`font-bold tabular-nums ${data.wickets > 0 ? 'text-red-400' : 'text-slate-300'}`}>{data.wickets}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Run Rate</span>
          <span className="font-bold text-emerald-400 tabular-nums">{data.runRate !== null ? data.runRate.toFixed(1) : '—'}</span>
        </div>
      </div>
    </div>
  );
}

function OverChartInner({ ballEvents, oversPerInnings, battingTeamName, compact = false }: OverChartProps) {
  const data = useMemo(() => buildData(ballEvents, oversPerInnings), [ballEvents, oversPerInnings]);

  if (ballEvents.length === 0) return null;

  const playedOvers = data.filter((d) => d.runs > 0);
  const averageRunsPerOver = playedOvers.length > 0
    ? Number((playedOvers.reduce((s, d) => s + d.runs, 0) / playedOvers.length).toFixed(1))
    : 0;

  return (
    <GlassCard variant="light" className="p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {compact ? 'Run Rate' : `${battingTeamName} — Runs per Over`}
            </p>
            <p className="text-[10px] text-slate-400">Ball-by-ball • {data.length} overs</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-slate-200 bg-white/10 px-2 py-1 rounded-full tabular-nums">
          Avg {averageRunsPerOver}
        </span>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 4, bottom: 0, left: -22 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="over"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={34}
            />
            <Tooltip content={<OverTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <ReferenceLine
              y={averageRunsPerOver}
              stroke="#fbbf24"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{ value: 'avg', position: 'insideTopRight', fill: '#fbbf24', fontSize: 9 }}
            />
            <Bar dataKey="runs" radius={[5, 5, 0, 0]} isAnimationActive animationDuration={900} animationEasing="ease-out" shape={<OverBarShape />}>
              {data.map((entry) => (
                <Cell key={entry.over} fill={overBarColor(entry.runs)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2 border-t border-white/10">
        <LegendDot color="#94a3b8" label="0–3" />
        <LegendDot color="#22c55e" label="4–6" />
        <LegendDot color="#06b6d4" label="7–10" />
        <LegendDot color="#a855f7" label="11–15" />
        <LegendDot color="#f59e0b" label="16+" />
        <div className="ml-auto flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow shadow-red-500/50" />
          <span className="text-[9px] text-slate-400">Wicket</span>
        </div>
      </div>
    </GlassCard>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[9px] text-slate-400">{label}</span>
    </div>
  );
}

export const OverChart = memo(OverChartInner);
