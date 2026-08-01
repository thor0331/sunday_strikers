import { useParams, useNavigate } from 'react-router-dom';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useParentMatches } from '../../hooks/useMatches';
import { usePlayerInningsHistory, usePlayerStreaks, usePotmCount } from '../../hooks/usePlayerDerived';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { GlassCard } from '../../components/common/GlassCard';
import { CareerStats } from '../../components/common/CareerStats';
import { RecentFormHeatmap } from '../../components/common/RecentFormHeatmap';
import { computeRecentForm } from '../../utils/recentForm';
import { useMemo, useState } from 'react';
import { ArrowLeft, Trophy, Target, TrendingUp, Flame, Award, Star, Shield, Swords, Zap, Medal } from 'lucide-react';

export function PlayerProfilePage() {
  const { playerId = '' } = useParams();
  const navigate = useNavigate();
  const { data: players = [] } = usePlayers();
  const { data: stats = [] } = usePlayerStatistics();
  const { data: matches = [] } = useParentMatches();
  const { data: inningsHistory = [] } = usePlayerInningsHistory(playerId || undefined);
  const { data: streaks = [] } = usePlayerStreaks(playerId || undefined);
  const potmCounts = usePotmCount();
  const avatarViewer = useAvatarViewerStore();
  const [photoFailed, setPhotoFailed] = useState(false);

  const player = useMemo(() => players.find((p) => p.id === playerId), [players, playerId]);
  const aggregatedStats = useMemo(() => {
    const s = stats.filter((st) => st.player_id === playerId);
    if (s.length === 0) return null;
    return s.reduce((acc, cur) => ({
      ...acc,
      matches_played: acc.matches_played + cur.matches_played,
      batting_innings: acc.batting_innings + cur.batting_innings,
      runs: acc.runs + cur.runs,
      balls_faced: acc.balls_faced + cur.balls_faced,
      fours: acc.fours + cur.fours,
      sixes: acc.sixes + cur.sixes,
      outs: acc.outs + cur.outs,
      highest_score: Math.max(acc.highest_score, cur.highest_score),
      bowling_innings: acc.bowling_innings + cur.bowling_innings,
      balls_bowled: acc.balls_bowled + cur.balls_bowled,
      runs_conceded: acc.runs_conceded + cur.runs_conceded,
      wickets: acc.wickets + cur.wickets,
      maidens: acc.maidens + cur.maidens,
      catches: acc.catches + cur.catches,
      run_outs: acc.run_outs + cur.run_outs,
      stumpings: acc.stumpings + cur.stumpings,
    }));
  }, [stats, playerId]);

  const potmCount = potmCounts[playerId] ?? 0;

  const potmMatchIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) {
      if (m.player_of_match_id === playerId) set.add(m.id);
    }
    return set;
  }, [matches, playerId]);

  const recentFormCells = useMemo(
    () => computeRecentForm({ playerId, matches, inningsHistory, potmMatchIds }),
    [playerId, matches, inningsHistory, potmMatchIds]
  );

  const completedMatches = useMemo(() => matches.filter((m) => m.status === 'completed'), [matches]);
  const recentMatches = useMemo(() => {
    return completedMatches
      .filter((m) => m.team_a_captain_id === playerId || m.team_b_captain_id === playerId || inningsHistory.some((ih) => ih.matchName === m.match_name))
      .slice(0, 5);
  }, [completedMatches, playerId, inningsHistory]);

  const captainWins = useMemo(() => {
    return completedMatches.filter((m) => {
      const isCaptain = m.team_a_captain_id === playerId || m.team_b_captain_id === playerId;
      if (!isCaptain) return false;
      return (m.winner === 'team_a' && m.team_a_captain_id === playerId) || (m.winner === 'team_b' && m.team_b_captain_id === playerId);
    }).length;
  }, [completedMatches, playerId]);

  const captainMatches = useMemo(() => completedMatches.filter((m) => m.team_a_captain_id === playerId || m.team_b_captain_id === playerId).length, [completedMatches, playerId]);

  const winPercentage = captainMatches > 0 ? Math.round((captainWins / captainMatches) * 100) : 0;

  const orangeCaps = useMemo(() => {
    const seasonBest = new Map<string, { playerId: string; runs: number }>();
    for (const s of stats) {
      if (!s.season_id) continue;
      const existing = seasonBest.get(s.season_id);
      if (!existing || s.runs > existing.runs) seasonBest.set(s.season_id, { playerId: s.player_id, runs: s.runs });
    }
    return [...seasonBest.values()].filter((v) => v.playerId === playerId).length;
  }, [stats, playerId]);

  const purpleCaps = useMemo(() => {
    const seasonBest = new Map<string, { playerId: string; wickets: number }>();
    for (const s of stats) {
      if (!s.season_id) continue;
      const existing = seasonBest.get(s.season_id);
      if (!existing || s.wickets > existing.wickets) seasonBest.set(s.season_id, { playerId: s.player_id, wickets: s.wickets });
    }
    return [...seasonBest.values()].filter((v) => v.playerId === playerId).length;
  }, [stats, playerId]);

  if (!player) return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-sm text-slate-400">Player not found.</p></div>;

  const avg = aggregatedStats && aggregatedStats.outs > 0 ? (aggregatedStats.runs / aggregatedStats.outs).toFixed(1) : '-';
  const sr = aggregatedStats && aggregatedStats.balls_faced > 0 ? ((aggregatedStats.runs / aggregatedStats.balls_faced) * 100).toFixed(1) : '-';
  const bowlAvg = aggregatedStats && aggregatedStats.wickets > 0 ? (aggregatedStats.runs_conceded / aggregatedStats.wickets).toFixed(1) : '-';
  const eco = aggregatedStats && aggregatedStats.balls_bowled > 0 ? (aggregatedStats.runs_conceded * 6 / aggregatedStats.balls_bowled).toFixed(1) : '-';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"><ArrowLeft className="w-5 h-5 text-slate-300" /></button>
        <h1 className="text-lg font-bold text-slate-100">Player Profile</h1>
      </div>

      {/* Player Header Card */}
      <GlassCard variant="strong" className="p-6 text-center">
        {player.photo_url && !photoFailed ? (
          <button onClick={() => avatarViewer.open(player.photo_url!, player.display_name)} className="mx-auto mb-3 h-24 w-24 overflow-full rounded-full border-4 border-white shadow-lg hover:scale-105 transition-transform">
            <img src={player.photo_url} alt={player.display_name} className="h-full w-full object-cover" onError={() => setPhotoFailed(true)} />
          </button>
        ) : (
          <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-3xl font-bold text-white shadow-lg">{player.display_name.charAt(0)}</div>
        )}
        <h2 className="text-xl font-bold text-slate-100">{player.display_name}</h2>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {player.batting_style && <span className="rounded-full bg-teal-400/10 px-3 py-0.5 text-xs font-medium text-teal-300">{player.batting_style}</span>}
          {player.bowling_style && <span className="rounded-full bg-sky-400/10 px-3 py-0.5 text-xs font-medium text-sky-300">{player.bowling_style}</span>}
        </div>
      </GlassCard>

      {/* Career Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 stagger-enter">
        <ProfileStat icon={<Trophy className="w-4 h-4" />} label="Matches" value={aggregatedStats?.matches_played ?? 0} gradient="from-slate-400 to-slate-600" />
        <ProfileStat icon={<TrendingUp className="w-4 h-4" />} label="Runs" value={aggregatedStats?.runs ?? 0} gradient="from-emerald-400 to-emerald-600" />
        <ProfileStat icon={<Target className="w-4 h-4" />} label="Wickets" value={aggregatedStats?.wickets ?? 0} gradient="from-purple-400 to-purple-600" />
        <ProfileStat icon={<Flame className="w-4 h-4" />} label="Highest" value={aggregatedStats?.highest_score ?? 0} gradient="from-red-400 to-rose-600" />
        <ProfileStat icon={<Zap className="w-4 h-4" />} label="Avg" value={avg} gradient="from-blue-400 to-blue-600" />
        <ProfileStat icon={<Shield className="w-4 h-4" />} label="SR" value={`${sr}%`} gradient="from-amber-400 to-amber-600" />
        <ProfileStat icon={<Target className="w-4 h-4" />} label="Best Bowl" value={aggregatedStats && aggregatedStats.wickets > 0 ? `${aggregatedStats.wickets}/${aggregatedStats.runs_conceded}` : '-'} gradient="from-indigo-400 to-indigo-600" />
        <ProfileStat icon={<Star className="w-4 h-4" />} label="Eco" value={eco} gradient="from-teal-400 to-teal-600" />
      </div>

      {/* Awards */}
      <div className="grid grid-cols-3 gap-3">
        <ProfileStat icon={<Star className="w-4 h-4" />} label="POTM" value={potmCount} gradient="from-amber-400 to-amber-600" />
        <ProfileStat icon={<span className="text-sm font-bold">O</span>} label="Orange Caps" value={orangeCaps} gradient="from-orange-400 to-orange-600" />
        <ProfileStat icon={<span className="text-sm font-bold">P</span>} label="Purple Caps" value={purpleCaps} gradient="from-violet-400 to-violet-600" />
      </div>

      {/* Captain Stats */}
      {captainMatches > 0 && (
        <GlassCard variant="light" className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white"><Swords className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Captain Record</p>
              <p className="text-sm font-semibold text-slate-200">{captainWins} wins in {captainMatches} matches ({winPercentage}%)</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Career Stats Detail */}
      {aggregatedStats && (
        <GlassCard variant="light" className="p-4">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Career Statistics</h3>
          <CareerStats stats={aggregatedStats} potmCount={potmCount} matchesPlayed={aggregatedStats.matches_played} />
        </GlassCard>
      )}

      {/* Streaks */}
      {streaks.length > 0 && (
        <GlassCard variant="light" className="p-4">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Active Streaks</h3>
          <div className="flex flex-wrap gap-2">
            {streaks.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
                <Flame className="w-3 h-3" />{s.count} {s.label}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Recent Matches */}
      {recentMatches.length > 0 && (
        <GlassCard variant="light" className="p-4">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Recent Matches</h3>
          <div className="space-y-2">
            {recentMatches.map((m) => (
              <button key={m.id} onClick={() => navigate(`/matches/${m.id}`)} className="w-full text-left rounded-lg border border-white/10 bg-white/[0.04] p-3 hover:border-teal-400/30 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-200 truncate">{m.match_name}</p>
                    <p className="text-xs text-slate-400">{m.match_date}</p>
                  </div>
                  {m.result_text && <span className="text-xs text-slate-400 truncate max-w-[40%] text-right">{m.result_text}</span>}
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Recent Form */}
      {recentFormCells.length > 0 && (
        <GlassCard variant="light" className="p-4">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Recent Form</h3>
          <RecentFormHeatmap cells={recentFormCells} />
        </GlassCard>
      )}

      {/* Performance Trend */}
      {inningsHistory.length > 1 && (
        <GlassCard variant="light" className="p-4">
          <h3 className="text-sm font-bold text-slate-200 mb-3">Performance Trend</h3>
          <div className="flex items-end gap-1.5 h-36">
            {inningsHistory.map((inn, i) => {
              const maxRuns = Math.max(...inningsHistory.map((h) => h.runs), 1);
              const height = Math.max((inn.runs / maxRuns) * 100, 4);
              const isOut = inn.isOut;
              return (
                <div
                  key={i}
                  title={`${inn.matchName ?? 'Match'}: ${inn.runs} off ${inn.balls ?? '-'}${isOut ? ' (out)' : '*'}`}
                  className="flex-1 flex flex-col items-center gap-1 min-w-0"
                >
                  <span className="text-[9px] text-slate-400 tabular-nums leading-none">{inn.runs}</span>
                  {isOut && <span className="text-[9px] font-bold text-red-300 leading-none">W</span>}
                  <div
                    className={`w-full rounded-t-md transition-all duration-700 ${
                      isOut
                        ? 'bg-gradient-to-t from-red-600 to-red-400 shadow-[0_0_12px_rgba(248,113,113,0.35)]'
                        : 'bg-gradient-to-t from-teal-600 to-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.3)]'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-slate-400">Oldest</span>
            <span className="inline-flex items-center gap-2 text-[9px] text-slate-400">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-teal-400" />Not out</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-400" />Dismissed</span>
            </span>
            <span className="text-[9px] text-slate-400">Latest</span>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function ProfileStat({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: number | string; gradient: string }) {
  return (
    <GlassCard variant="light" className="p-3 text-center">
      <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white shadow-sm`}>{icon}</div>
      <p className="text-lg font-bold text-slate-100 tabular-nums">{value}</p>
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
    </GlassCard>
  );
}
