import type { DerivedInningsState } from '../../types/models';
import { TrendingUp, Gauge, Target, Eye } from 'lucide-react';

interface MatchSituationCardProps {
  inningsState: DerivedInningsState;
  targetRuns: number | null;
  oversPerInnings: number;
}

export function MatchSituationCard({ inningsState, targetRuns, oversPerInnings }: MatchSituationCardProps) {
  const isChase = targetRuns != null;

  if (isChase) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white/40 backdrop-blur-sm p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-amber-500" /> Chase Situation
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-50/40 border border-amber-200/60 p-3 text-center backdrop-blur-sm">
            <p className="text-[9px] text-amber-600/70 uppercase font-bold tracking-wider">Target</p>
            <p className="text-xl font-extrabold text-amber-700">{targetRuns}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-50/40 border border-emerald-200/60 p-3 text-center backdrop-blur-sm">
            <p className="text-[9px] text-emerald-600/70 uppercase font-bold tracking-wider">Required</p>
            <p className="text-xl font-extrabold text-emerald-700">{inningsState.runsRequired ?? '-'}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-sky-50/80 to-sky-50/40 border border-sky-200/60 p-3 text-center backdrop-blur-sm">
            <p className="text-[9px] text-sky-600/70 uppercase font-bold tracking-wider">Balls Left</p>
            <p className="text-xl font-extrabold text-sky-700">{inningsState.ballsRemaining ?? '-'}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-50/80 to-purple-50/40 border border-purple-200/60 p-3 text-center backdrop-blur-sm">
            <p className="text-[9px] text-purple-600/70 uppercase font-bold tracking-wider">RRR</p>
            <p className="text-xl font-extrabold text-purple-700">{inningsState.requiredRunRate?.toFixed(1) ?? '-'}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-1">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-teal-500" /> CRR: <strong className="text-slate-700">{inningsState.currentRunRate.toFixed(1)}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="w-3 h-3 text-amber-500" /> RRR: <strong className="text-slate-700">{inningsState.requiredRunRate?.toFixed(1) ?? '-'}</strong>
          </span>
        </div>
      </div>
    );
  }

  const projectedScore = Math.round(inningsState.currentRunRate * oversPerInnings);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/40 backdrop-blur-sm p-4 shadow-sm space-y-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-teal-500" /> First Innings Report
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-gradient-to-br from-teal-50/80 to-teal-50/40 border border-teal-200/60 p-4 text-center backdrop-blur-sm">
          <p className="text-[9px] text-teal-600/70 uppercase font-bold tracking-wider">Current RR</p>
          <p className="text-2xl font-extrabold text-teal-700">{inningsState.currentRunRate.toFixed(1)}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-50/80 to-blue-50/40 border border-blue-200/60 p-4 text-center backdrop-blur-sm">
          <p className="text-[9px] text-blue-600/70 uppercase font-bold tracking-wider">Projected</p>
          <p className="text-2xl font-extrabold text-blue-700">{projectedScore}</p>
        </div>
      </div>
    </div>
  );
}
