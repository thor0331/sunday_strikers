import { useMemo } from 'react';
import { computeWinProbability } from '../../utils/analytics';

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

export function WinPredictor({
  targetRuns, currentRuns, wicketsLost, totalWickets, oversUsed, totalOvers,
  battingTeamName, bowlingTeamName
}: WinPredictorProps) {
  const battingProb = useMemo(() =>
    computeWinProbability(targetRuns, currentRuns, wicketsLost, totalWickets, oversUsed, totalOvers),
    [targetRuns, currentRuns, wicketsLost, totalWickets, oversUsed, totalOvers]
  );
  const bowlingProb = 100 - battingProb;

  const getColor = (prob: number) => {
    if (prob >= 70) return 'bg-emerald-500';
    if (prob >= 40) return 'bg-amber-400';
    return 'bg-red-400';
  };

  // BUG FIX: Show predictor even at innings start (oversUsed=0) when chasing
  if (targetRuns <= 0 || totalOvers <= 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Winning Chance</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 truncate max-w-[120px]">{battingTeamName}</span>
          <span className={`font-bold ${battingProb >= 50 ? 'text-emerald-600' : battingProb >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{battingProb}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${getColor(battingProb)}`} style={{ width: `${battingProb}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 truncate max-w-[120px]">{bowlingTeamName}</span>
          <span className={`font-bold ${bowlingProb >= 50 ? 'text-emerald-600' : bowlingProb >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{bowlingProb}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${getColor(bowlingProb)}`} style={{ width: `${bowlingProb}%` }} />
        </div>
      </div>
    </div>
  );
}
