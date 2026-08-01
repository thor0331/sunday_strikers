import { motion } from 'framer-motion';
import { Sparkles, Trophy, Activity } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { CircularAvatar } from './CircularAvatar';
import type { ImpactCandidate } from '../../utils/matchAnalytics';

interface ImpactSpotlightProps {
  candidate: ImpactCandidate | null;
  potmName: string | null;
  potmPhoto?: string | null;
  onPhotoClick?: () => void;
  matchResult?: string | null;
}

function breakdownBar(label: string, value: number, color: string) {
  const max = Math.max(value, 1);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="text-[11px] font-bold text-slate-200 tabular-nums">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

export function ImpactSpotlight({ candidate, potmName, potmPhoto, onPhotoClick, matchResult }: ImpactSpotlightProps) {
  if (!candidate) return null;

  const isPotm = potmName != null && candidate.name === potmName;

  return (
    <GlassCard variant="dark" glow="teal" className="relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-600/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-gradient-to-tr from-violet-500/10 to-transparent blur-2xl" />

      <div className="relative flex flex-col sm:flex-row items-center gap-5">
        <div className="relative shrink-0">
          <CircularAvatar src={potmPhoto} alt={candidate.name} size="lg" onClick={onPhotoClick} />
          {isPotm && (
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-400 text-white shadow-lg shadow-amber-400/40">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <div className="p-1 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
              {isPotm ? 'Spotlight • Player of the Match' : 'Spotlight • Top Impact'}
            </p>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 truncate">{candidate.name}</h3>
          <p className="text-sm text-slate-300 mt-0.5">{candidate.battingLabel ?? candidate.bowlingLabel ?? candidate.fieldingLabel}</p>
          {matchResult && <p className="text-xs text-teal-200 mt-1 font-medium">{matchResult}</p>}
        </div>

        <div className="text-center shrink-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#impactGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="263.9"
                initial={{ strokeDashoffset: 263.9 }}
                animate={{ strokeDashoffset: 263.9 * (1 - Math.min(candidate.total, 100) / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="impactGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-white tabular-nums">{candidate.total}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-teal-300">Impact</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {breakdownBar('Batting', candidate.breakdown.batting, 'bg-gradient-to-r from-teal-400 to-emerald-500')}
        {breakdownBar('Bowling', candidate.breakdown.bowling, 'bg-gradient-to-r from-violet-400 to-purple-500')}
        {breakdownBar('Fielding', candidate.breakdown.fielding, 'bg-gradient-to-r from-amber-400 to-orange-500')}
      </div>

      {candidate.reason && (
        <div className="relative mt-4 flex items-start gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <Activity className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            <span className="font-bold text-white">Why {candidate.name} stood out:</span> {candidate.reason}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
