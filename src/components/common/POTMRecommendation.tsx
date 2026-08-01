import { useMemo } from 'react';
import type { BallEvent } from '../../types/models';
import { CircularAvatar } from './CircularAvatar';
import { Sparkles, Zap } from 'lucide-react';
import { computePOTMRecommendation, type POTMRecommendationParams } from '../../utils/potmRecommendation';

interface POTMRecommendationProps extends POTMRecommendationParams {
  photoMap: Map<string, string | null>;
  onSelect?: (playerId: string) => void;
}

export function POTMRecommendation({ events, playerMap, chasePlayerIds, chaseState, photoMap, onSelect }: POTMRecommendationProps) {
  const recommendation = useMemo(
    () => computePOTMRecommendation({ events, playerMap, chasePlayerIds, chaseState }),
    [events, playerMap, chasePlayerIds, chaseState]
  );

  if (!recommendation) return null;

  const photo = photoMap.get(recommendation.playerId);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0F1B2D]/95 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 to-cyan-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-300">
            <Sparkles className="w-3 h-3" /> AI Recommendation
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-3">
          <CircularAvatar src={photo} alt={recommendation.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-white">{recommendation.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              {recommendation.battingLine && <span className="font-bold text-emerald-300 tabular-nums">{recommendation.battingLine}</span>}
              {recommendation.bowlingLine && <span className="font-bold text-rose-400 tabular-nums">{recommendation.bowlingLine}</span>}
              {recommendation.fieldingLine && <span className="font-bold text-cyan-300">{recommendation.fieldingLine}</span>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-1 text-2xl font-extrabold text-white tabular-nums">
              <Zap className="h-4 w-4 text-amber-400" />
              {recommendation.impact}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Impact</p>
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-slate-400">Confidence</span>
            <span className="font-bold text-emerald-300 tabular-nums">
              {recommendation.confidence}% · {recommendation.confidenceLabel}
            </span>
          </div>
          <div className="mt-1.5 relative h-2 overflow-visible">
            <div className="absolute inset-0 rounded-full bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]" />
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 animate-grow-bar shadow-[0_0_12px_rgba(16,185,129,0.45)]"
              style={{ width: `${recommendation.confidence}%` }}
            />
            <div
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-emerald-300 bg-white shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-grow-bar"
              style={{ left: `calc(${recommendation.confidence}% - 5px)` }}
            />
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-snug text-slate-300">{recommendation.reason}</p>

        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(recommendation.playerId)}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 hover:brightness-110 btn-press"
          >
            <Sparkles className="w-3.5 h-3.5" /> Use as Player of the Match
          </button>
        )}
      </div>
    </div>
  );
}
