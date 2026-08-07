import { useMatch, useInnings } from '../../hooks/useMatches';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Gauge } from 'lucide-react';
import { getTeamColors, type TeamSide } from '../../utils/teamColors';
import { GlassCard } from './GlassCard';
import { WatchLiveLink } from './WatchLiveLink';

function LiveInningsDisplay({ matchId }: { matchId: string }) {
  const { data: match } = useMatch(matchId);
  const { data: inningsList = [] } = useInnings(matchId);

  const currentInnings = inningsList.find(i => i.status === 'in_progress')
    ?? inningsList.filter(i => i.status === 'not_started').sort((a, b) => b.innings_number - a.innings_number)[0];
  const prevInnings = inningsList.find(i => i.status === 'completed');

  const { data: ballEvents = [] } = useBallEvents(currentInnings?.id ?? null);

  const state = useMemo(() => {
    if (!currentInnings || !match) return null;
    if (ballEvents.length === 0) {
      return {
        totalRuns: 0,
        wickets: 0,
        oversDisplay: '0.0',
        currentRunRate: 0,
        requiredRunRate: null,
        targetRuns: currentInnings.target_runs ?? null,
        runsRequired: currentInnings.target_runs ?? null,
        ballsRemaining: currentInnings.target_runs ? match.overs_per_innings * 6 : null,
      };
    }
    const context: ScoringContext = {
      inningsId: currentInnings.id,
      openingStrikerId: '',
      openingNonStrikerId: '',
      battingOrder: [],
      oversPerInnings: match.overs_per_innings,
      playersPerTeam: match.players_per_team,
      targetRuns: currentInnings.target_runs,
    };
    try { return calculateInningsState(context, ballEvents); } catch { return null; }
  }, [currentInnings, match, ballEvents]);

  if (!match || !currentInnings) return null;

  const battingSide = currentInnings.batting_team as TeamSide;
  const colors = getTeamColors(battingSide);
  const isScoringActive = currentInnings.status === 'in_progress';

  return (
    <div className="space-y-3">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-50 truncate">{match.match_name}</p>
          <p className="text-xs text-slate-400">{match.venue || 'No venue'}</p>
        </div>
        {match.status === 'completed' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-300 border border-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            RESULT
          </span>
        ) : isScoringActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-300 border border-red-500/30 animate-live-pulse">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            LIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-300 border border-amber-400/30">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            TOSS DONE
          </span>
        )}
      </div>

      {/* Score Card - Premium Glass Dark */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 p-5 shadow-2xl border border-slate-700/50">
        {/* Glass overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        
        {/* Live pulse ring */}
        {isScoringActive && (
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-red-500/10 blur-3xl animate-pulse" />
        )}
        
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              {!isScoringActive && match.status !== 'completed' ? (
                <div className="space-y-1">
                  <p className="text-lg font-bold text-white">{match.team_a_name}</p>
                  <p className="text-sm text-slate-400 font-semibold">vs</p>
                  <p className="text-lg font-bold text-white">{match.team_b_name}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white tabular-nums">{state ? state.totalRuns : 0}</span>
                    <span className="text-slate-400 font-bold text-2xl">/{state?.wickets ?? 0}</span>
                    <span className="text-slate-400 text-sm ml-1 font-medium">
                      ({state?.oversDisplay ?? '0.0'} ov)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    {currentInnings.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} {isScoringActive ? 'bat' : 'to bat'}
                  </p>
                </>
              )}
            </div>
            {currentInnings.batting_team === 'team_a' ? (
              <div className={`flex items-center justify-center w-14 h-14 rounded-full ${colors.light} ${colors.text} font-extrabold text-xl shadow-lg ring-4 ring-white/20`}>
                A
              </div>
            ) : (
              <div className={`flex items-center justify-center w-14 h-14 rounded-full ${colors.light} ${colors.text} font-extrabold text-xl shadow-lg ring-4 ring-white/20`}>
                B
              </div>
            )}
          </div>

          {/* Target / Need / Left */}
          {currentInnings.target_runs && state && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-2.5 text-center border border-white/5">
                <p className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">Target</p>
                <p className="text-teal-300 font-extrabold text-xl tabular-nums">{currentInnings.target_runs}</p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-2.5 text-center border border-white/5">
                <p className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">Need</p>
                <p className="text-amber-300 font-extrabold text-xl tabular-nums">{state.runsRequired ?? '-'}</p>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm p-2.5 text-center border border-white/5">
                <p className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">Left</p>
                <p className="text-sky-300 font-extrabold text-xl tabular-nums">{state.ballsRemaining ?? '-'}</p>
              </div>
            </div>
          )}

          {/* CRR / RRR */}
          {state && (
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                CRR: <strong className="text-slate-200 tabular-nums">{state.currentRunRate.toFixed(1)}</strong>
              </span>
              {currentInnings.target_runs && state.requiredRunRate != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  RRR: <strong className="text-slate-200 tabular-nums">{state.requiredRunRate.toFixed(1)}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Previous Innings Score */}
      {prevInnings && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 glass rounded-xl px-3 py-2 min-w-0">
          <span className="font-semibold text-slate-300 shrink-0">1st Innings:</span>
          <span className="truncate min-w-0">{prevInnings.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}</span>
          <span className="font-bold text-slate-200 shrink-0">{prevInnings.target_runs ? `${prevInnings.target_runs - 1}/all out` : 'Completed'}</span>
        </div>
      )}
    </div>
  );
}

export function LiveMatchCard({ matchId }: { matchId: string }) {
  return (
    <GlassCard variant="light" hover glow="red" className="p-4">
      <Link to={`/matches/${matchId}`} className="block">
        <LiveInningsDisplay matchId={matchId} />
      </Link>
      <WatchLiveLink matchId={matchId} />
    </GlassCard>
  );
}

export function LiveMatchBanner({ matchId }: { matchId: string }) {
  return (
    <GlassCard variant="strong" hover glow="red" className="p-5 border-2 border-red-400/30">
      <Link to={`/matches/${matchId}`} className="block">
        <LiveInningsDisplay matchId={matchId} />
      </Link>
      <WatchLiveLink matchId={matchId} />
    </GlassCard>
  );
}
