import { useMemo, useState, useEffect } from 'react';
import type { BallEvent } from '../../types/models';
import { GlassCard } from './GlassCard';
import { TrendingUp } from 'lucide-react';

interface MomentumGraphProps {
  ballEvents: BallEvent[];
  oversPerInnings: number;
  battingTeamName: string;
  compact?: boolean;
}

export function MomentumGraph({ ballEvents, oversPerInnings, battingTeamName, compact = false }: MomentumGraphProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const oversData = useMemo(() => {
    const overs = new Map<number, number>();
    for (const event of ballEvents) {
      const ov = event.overNumber;
      overs.set(ov, (overs.get(ov) ?? 0) + event.runsBatter + event.runsExtra);
    }
    const result: { over: number; runs: number }[] = [];
    for (let i = 0; i < oversPerInnings; i++) {
      result.push({ over: i + 1, runs: overs.get(i) ?? 0 });
    }
    return result;
  }, [ballEvents, oversPerInnings]);

  const maxRuns = Math.max(...oversData.map(o => o.runs), 1);
  const avgRuns = oversData.reduce((s, o) => s + o.runs, 0) / oversData.length;

  if (ballEvents.length === 0) return null;

  const getBarColor = (runs: number) => {
    if (runs === 0) return '#e2e8f0';
    if (runs >= 12) return '#7c3aed';
    if (runs >= 10) return '#0891b2';
    if (runs >= 8) return '#0d9488';
    if (runs >= 6) return '#059669';
    if (runs >= 4) return '#0d9488';
    if (runs >= 2) return '#94a3b8';
    return '#cbd5e1';
  };

  const getGradient = (runs: number) => {
    if (runs === 0) return 'from-slate-100 to-slate-200';
    if (runs >= 12) return 'from-violet-400 to-violet-600';
    if (runs >= 8) return 'from-teal-400 to-teal-600';
    if (runs >= 4) return 'from-emerald-400 to-emerald-600';
    return 'from-slate-300 to-slate-400';
  };

  return (
    <GlassCard variant="light" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-500" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {compact ? 'Run Rate' : `${battingTeamName} — Runs per Over`}
          </p>
        </div>
        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">
          Avg: {avgRuns.toFixed(1)}
        </span>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end gap-1 h-28 sm:h-32">
        {oversData.map((o, index) => (
          <div
            key={o.over}
            className="flex-1 flex flex-col items-center gap-1 group"
            style={{
              opacity: animated ? 1 : 0,
              transform: animated ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 0.4s ease ${index * 0.03}s, transform 0.4s ease ${index * 0.03}s`,
            }}
          >
            {/* Value label on hover */}
            <span className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {o.runs}
            </span>

            {/* Bar */}
            <div className="w-full rounded-md transition-all duration-300 hover:opacity-80 relative overflow-hidden"
              style={{
                height: `${(o.runs / maxRuns) * 100}%`,
                minHeight: o.runs > 0 ? '4px' : '2px',
                backgroundColor: getBarColor(o.runs),
              }}
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${getGradient(o.runs)} opacity-60`} />
            </div>

            {/* Over number */}
            <span className="text-[9px] text-slate-400 font-medium tabular-nums">{o.over}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100">
        <LegendDot color="#059669" label="4+" />
        <LegendDot color="#0d9488" label="6+" />
        <LegendDot color="#0891b2" label="8+" />
        <LegendDot color="#7c3aed" label="12+" />
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
