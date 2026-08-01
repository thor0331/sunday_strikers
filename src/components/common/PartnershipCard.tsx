import { useId, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { BallEvent } from '../../types/models';
import { computePartnership } from '../../domain/scoring/liveMatchUtils';

interface PartnershipCardProps {
  ballEvents: BallEvent[];
  strikerId: string | null;
  nonStrikerId: string | null;
}

export function PartnershipCard({ ballEvents, strikerId, nonStrikerId }: PartnershipCardProps) {
  const partnership = computePartnership(ballEvents, strikerId, nonStrikerId);
  const gradientId = useId().replace(/:/g, '');

  const extraInfo = useMemo(() => {
    if (!strikerId || !nonStrikerId) return { fours: 0, sixes: 0 };
    let start = -1;
    for (let i = 0; i < ballEvents.length; i++) {
      const e = ballEvents[i];
      if (
        (e.strikerId === strikerId && e.nonStrikerId === nonStrikerId) ||
        (e.strikerId === nonStrikerId && e.nonStrikerId === strikerId)
      ) {
        if (start === -1) start = i;
      }
    }
    let fours = 0;
    let sixes = 0;
    for (let i = start; i < ballEvents.length; i++) {
      if (ballEvents[i].runsBatter === 4) fours += 1;
      if (ballEvents[i].runsBatter === 6) sixes += 1;
    }
    return { fours, sixes };
  }, [ballEvents, strikerId, nonStrikerId]);

  if (!strikerId || !nonStrikerId) return null;

  const fill = Math.min((partnership.runs * 3) / Math.max(partnership.balls, 1), 1);

  return (
    <div className="card-premium relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-teal-400/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Partnership</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-400/10 border border-teal-400/25 px-2.5 py-0.5 text-[11px] font-bold text-teal-300 tabular-nums">
          {partnership.balls} balls
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4">
        {/* Semi-circle gauge */}
        <div className="relative w-28 shrink-0">
          <svg viewBox="0 0 100 52" className="w-full">
            <defs>
              <linearGradient id={`part-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="60%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d="M 6 46 A 44 44 0 0 1 94 46"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <motion.path
              d="M 6 46 A 44 44 0 0 1 94 46"
              fill="none"
              stroke={`url(#part-${gradientId})`}
              strokeWidth="7"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 6px rgba(45,212,191,0.35))' }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: fill }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className="text-2xl font-extrabold text-slate-50 tabular-nums leading-none">{partnership.runs}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">runs</span>
          </div>
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
            <span className="text-xs text-slate-400">Balls</span>
            <span className="text-sm font-bold text-slate-100 tabular-nums">{partnership.balls}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
            <span className="text-xs text-slate-400">Boundaries</span>
            <span className="text-sm font-bold text-emerald-300 tabular-nums">
              {extraInfo.fours} <span className="text-slate-500">x</span>4 · {extraInfo.sixes} <span className="text-slate-500">x</span>6
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
            <span className="text-xs text-slate-400">Run Rate</span>
            <span className="text-sm font-bold text-cyan-300 tabular-nums">
              {partnership.balls > 0 ? ((partnership.runs * 6) / partnership.balls).toFixed(1) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
