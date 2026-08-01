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
      <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-amber-400" /> Chase Situation
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/25 p-3 text-center backdrop-blur-sm">
            <p className="text-[9px] text-amber-300/80 uppercase font-bold tracking-wider">Target</p>
            <p className="text-xl font-extrabold text-amber-300">{targetRuns}</p>
          </div>
          <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/25 p-3 text-center backdrop-blur-sm">
            <p className="text-[9px] text-emerald-300/80 uppercase font-bold tracking-wider">Required</p>
            <p className="text-xl font-extrabold text-emerald-300">{inningsState.runsRequired ?? '-'}</p>
          </div>
          <div className="rounded-xl bg-sky-400/10 border border-sky-400/25 p-3 text-center backdrop-blur-sm">
            <p className="text-[9px] text-sky-300/80 uppercase font-bold tracking-wider">Balls Left</p>
            <p className="text-xl font-extrabold text-sky-300">{inningsState.ballsRemaining ?? '-'}</p>
          </div>
          <div className="rounded-xl bg-purple-400/10 border border-purple-400/25 p-3 text-center backdrop-blur-sm">
            <p className="text-[9px] text-purple-300/80 uppercase font-bold tracking-wider">RRR</p>
            <p className="text-xl font-extrabold text-purple-300">{inningsState.requiredRunRate?.toFixed(1) ?? '-'}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-1">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-teal-400" /> CRR: <strong className="text-slate-200">{inningsState.currentRunRate.toFixed(1)}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="w-3 h-3 text-amber-400" /> RRR: <strong className="text-slate-200">{inningsState.requiredRunRate?.toFixed(1) ?? '-'}</strong>
          </span>
        </div>
      </div>
    );
  }

  const projectedScore = Math.round(inningsState.currentRunRate * oversPerInnings);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 shadow-sm space-y-3">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5 text-teal-400" /> First Innings Report
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-teal-400/10 border border-teal-400/25 p-4 text-center backdrop-blur-sm">
          <p className="text-[9px] text-teal-300/80 uppercase font-bold tracking-wider">Current RR</p>
          <p className="text-2xl font-extrabold text-teal-300">{inningsState.currentRunRate.toFixed(1)}</p>
        </div>
        <div className="rounded-xl bg-sky-400/10 border border-sky-400/25 p-4 text-center backdrop-blur-sm">
          <p className="text-[9px] text-sky-300/80 uppercase font-bold tracking-wider">Projected</p>
          <p className="text-2xl font-extrabold text-sky-300">{projectedScore}</p>
        </div>
      </div>
    </div>
  );
}
