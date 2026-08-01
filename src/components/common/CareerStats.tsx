import type { PlayerStatistics } from '../../types/models';

interface CareerStatsProps {
  stats: PlayerStatistics | undefined;
  potmCount: number;
  matchesPlayed: number;
}

function StatBar({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300">{label}</span>
        <span className="font-bold text-slate-200">{value}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CareerStats({ stats, potmCount, matchesPlayed }: CareerStatsProps) {
  if (!stats) {
    return (
      <div className="rounded-[18px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.22)]">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Career Overview</p>
        <p className="text-sm text-slate-400 text-center py-4">No statistics available yet. Play your first match to unlock career stats.</p>
      </div>
    );
  }

  const maxVal = Math.max(stats.runs, stats.wickets * 10, stats.matches_played * 30, 50);

  return (
    <div className="rounded-[18px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-5 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.22)]">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Career Overview</p>
      <StatBar label="Runs" value={stats.runs} max={maxVal} color="bg-teal-400" unit="" />
      <StatBar label="Wickets" value={stats.wickets} max={Math.max(maxVal / 10, 1)} color="bg-red-400" unit="" />
      <StatBar label="Matches" value={stats.matches_played} max={Math.max(matchesPlayed, 1)} color="bg-sky-400" unit="" />
      <StatBar label="POTM" value={potmCount} max={Math.max(potmCount, 1)} color="bg-amber-400" unit="" />

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
        <div className="text-center p-2 rounded-lg bg-white/[0.04]">
          <p className="text-[9px] text-slate-400 uppercase font-bold">Avg</p>
          <p className="text-sm font-bold text-slate-200">{stats.outs > 0 ? (stats.runs / stats.outs).toFixed(1) : '-'}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.04]">
          <p className="text-[9px] text-slate-400 uppercase font-bold">SR</p>
          <p className="text-sm font-bold text-slate-200">{stats.balls_faced > 0 ? ((stats.runs / stats.balls_faced) * 100).toFixed(1) : '-'}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.04]">
          <p className="text-[9px] text-slate-400 uppercase font-bold">Eco</p>
          <p className="text-sm font-bold text-slate-200">{stats.balls_bowled > 0 ? ((stats.runs_conceded / stats.balls_bowled) * 6).toFixed(1) : '-'}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.04]">
          <p className="text-[9px] text-slate-400 uppercase font-bold">HS</p>
          <p className="text-sm font-bold text-slate-200">{stats.highest_score}</p>
        </div>
      </div>
    </div>
  );
}
