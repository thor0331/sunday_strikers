import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { computeWinProbability } from '../../utils/analytics';
import { CountUp } from './CountUp';

interface WinPredictorProps {
  targetRuns: number;
  currentRuns: number;
  wicketsLost: number;
  totalWickets: number;
  oversUsed: number;
  totalOvers: number;
  battingTeamName: string;
  bowlingTeamName: string;
}

function ProbBar({ label, prob, gradient }: { label: string; prob: number; gradient: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-200 truncate max-w-[120px]">{label}</span>
        <span className={`font-bold tabular-nums ${prob >= 50 ? 'text-emerald-300' : prob >= 30 ? 'text-amber-300' : 'text-red-300'}`}>
          <CountUp value={prob} duration={600} />%
        </span>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-white/10 overflow-hidden relative">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          style={{ filter: `drop-shadow(0 0 6px ${prob >= 50 ? 'rgba(16,185,129,0.4)' : prob >= 30 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'})` }}
          initial={{ width: 0 }}
          animate={{ width: `${prob}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/30 to-transparent" />
      </div>
    </div>
  );
}

export function WinPredictor({
  targetRuns, currentRuns, wicketsLost, totalWickets, oversUsed, totalOvers,
  battingTeamName, bowlingTeamName
}: WinPredictorProps) {
  const battingProb = useMemo(() =>
    computeWinProbability(targetRuns, currentRuns, wicketsLost, totalWickets, oversUsed, totalOvers),
    [targetRuns, currentRuns, wicketsLost, totalWickets, oversUsed, totalOvers]
  );
  const bowlingProb = 100 - battingProb;

  // BUG FIX: Show predictor even at innings start (oversUsed=0) when chasing
  if (targetRuns <= 0 || totalOvers <= 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
          <span className="text-[10px] font-black">%</span>
        </div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Winning Chance</h3>
      </div>
      <div className="space-y-3">
        <ProbBar
          label={battingTeamName}
          prob={battingProb}
          gradient={battingProb >= 50 ? 'from-emerald-500 to-teal-400' : battingProb >= 30 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-rose-400'}
        />
        <ProbBar
          label={bowlingTeamName}
          prob={bowlingProb}
          gradient={bowlingProb >= 50 ? 'from-emerald-500 to-teal-400' : bowlingProb >= 30 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-rose-400'}
        />
      </div>
    </div>
  );
}
