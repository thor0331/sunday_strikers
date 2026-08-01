import type { DerivedInningsState, Innings, Match } from '../../types/models';
import { CountUp } from './CountUp';
import { MatchFormatBadge } from './MatchFormatBadge';
import { Gauge, MapPin, TrendingUp } from 'lucide-react';

interface BroadcastScoreBoardProps {
  match: Match;
  innings: Innings;
  state: DerivedInningsState;
  battingTeamName: string;
  bowlingTeamName: string;
}

export function BroadcastScoreBoard({
  match,
  innings,
  state,
  battingTeamName,
  bowlingTeamName,
}: BroadcastScoreBoardProps) {
  const isChase = innings.target_runs != null;
  const isLive = match.status === 'in_progress';

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 shadow-2xl">
      {/* Ambient broadcast gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-rose-500/10" />

      {/* Score flash — remounts on every totalRuns change */}
      <div key={state.totalRuns} className="animate-broadcast-flash pointer-events-none absolute inset-0 bg-white/25" />

      <div className="relative px-5 py-5 sm:px-8 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white sm:text-base">{match.match_name}</p>
            <p className="flex items-center gap-1 text-[11px] text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{match.venue || 'No venue'}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <MatchFormatBadge format={match.match_format} />
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-300 animate-live-pulse">
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                {match.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Score row */}
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {innings.innings_number === 1 ? '1st Innings' : '2nd Innings'} · {battingTeamName}
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-6xl font-extrabold tracking-tight text-white tabular-nums drop-shadow-[0_0_24px_rgba(34,211,238,0.25)] sm:text-7xl">
                <CountUp value={state.totalRuns} duration={600} />
              </span>
              <span className="text-4xl font-bold text-slate-500 tabular-nums">
                /<CountUp value={state.wickets} duration={600} />
              </span>
              <span className="text-lg font-semibold text-slate-400 tabular-nums">({state.oversDisplay} ov)</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
                CRR <strong className="text-slate-200 tabular-nums">{state.currentRunRate.toFixed(1)}</strong>
              </span>
              {isChase && state.requiredRunRate != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-amber-400" />
                  RRR <strong className="text-slate-200 tabular-nums">{state.requiredRunRate.toFixed(1)}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Target panel */}
          {isChase && (
            <div className="grid shrink-0 grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Target</p>
                <p className="text-lg font-extrabold text-teal-300 tabular-nums">{innings.target_runs}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Need</p>
                <p className="text-lg font-extrabold text-amber-300 tabular-nums">{state.runsRequired ?? '–'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Balls Left</p>
                <p className="text-lg font-extrabold text-sky-300 tabular-nums">{state.ballsRemaining ?? '–'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom strip */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-400">
          <span>
            Batting: <strong className="text-slate-200">{battingTeamName}</strong>
          </span>
          <span>
            Bowling: <strong className="text-slate-200">{bowlingTeamName}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
