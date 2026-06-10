import { useMatch, useInnings } from '../../hooks/useMatches';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Gauge } from 'lucide-react';
import { getTeamColors, type TeamSide } from '../../utils/teamColors';
import { GlassCard } from './GlassCard';

function LiveInningsDisplay({ matchId }: { matchId: string }) {
  const { data: match } = useMatch(matchId);
  const { data: inningsList = [] } = useInnings(matchId);

  const currentInnings = inningsList.find(i => i.status === 'in_progress')
    ?? inningsList.filter(i => i.status === 'not_started').sort((a, b) => b.innings_number - a.innings_number)[0];
  const prevInnings = inningsList.find(i => i.status === 'completed');

  const { data: ballEvents = [] } = useBallEvents(currentInnings?.id ?? null);

  const state = useMemo(() => {
    if (!currentInnings || !match || ballEvents.length === 0) return null;
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{match.match_name}</p>
          <p className="text-xs text-slate-500">{match.venue || 'No venue'}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600 border border-red-200 animate-live-pulse">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Score Card - Glass Dark */}
      <div className="glass-dark rounded-2xl p-5 glow-red">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tabular-nums">{state ? state.totalRuns : 0}</span>
              <span className="text-slate-400 font-bold text-xl">/{state?.wickets ?? 0}</span>
              <span className="text-slate-500 text-xs ml-1 font-medium">
                ({state?.oversDisplay ?? '0.0'} ov)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{currentInnings.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} bat</p>
          </div>
          {currentInnings.batting_team === 'team_a' ? (
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${colors.light} ${colors.text} font-extrabold text-lg shadow-lg`}>
              A
            </div>
          ) : (
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${colors.light} ${colors.text} font-extrabold text-lg shadow-lg`}>
              B
            </div>
          )}
        </div>

        {/* Target / Need / Left */}
        {currentInnings.target_runs && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-2.5 text-center">
              <p className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">Target</p>
              <p className="text-teal-300 font-extrabold text-lg tabular-nums">{currentInnings.target_runs}</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-2.5 text-center">
              <p className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">Need</p>
              <p className="text-amber-300 font-extrabold text-lg tabular-nums">{state?.runsRequired ?? '-'}</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm p-2.5 text-center">
              <p className="text-slate-400 uppercase text-[10px] font-bold tracking-wider">Left</p>
              <p className="text-sky-300 font-extrabold text-lg tabular-nums">{state?.ballsRemaining ?? '-'}</p>
            </div>
          </div>
        )}

        {/* CRR / RRR */}
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
            CRR: <strong className="text-slate-200 tabular-nums">{state?.currentRunRate.toFixed(1) ?? '0.0'}</strong>
          </span>
          {currentInnings.target_runs && (
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              RRR: <strong className="text-slate-200 tabular-nums">{state?.requiredRunRate?.toFixed(1) ?? '0.0'}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Previous Innings Score */}
      {prevInnings && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 glass rounded-xl px-3 py-2">
          <span className="font-semibold text-slate-600">1st Innings:</span>
          <span>{prevInnings.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}</span>
          <span className="font-bold text-slate-700">{prevInnings.target_runs ? `${prevInnings.target_runs - 1}/all out` : 'Completed'}</span>
        </div>
      )}
    </div>
  );
}

export function LiveMatchCard({ matchId }: { matchId: string }) {
  return (
    <Link to={`/matches/${matchId}`} className="block">
      <GlassCard variant="light" hover glow="red" className="p-4">
        <LiveInningsDisplay matchId={matchId} />
      </GlassCard>
    </Link>
  );
}

export function LiveMatchBanner({ matchId }: { matchId: string }) {
  return (
    <Link to={`/matches/${matchId}`} className="block">
      <GlassCard variant="strong" hover glow="red" className="p-5 border-2 border-red-200/50">
        <LiveInningsDisplay matchId={matchId} />
      </GlassCard>
    </Link>
  );
}
