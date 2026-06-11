import { PagePanel } from '../../components/common/PagePanel';
import { GlassCard } from '../../components/common/GlassCard';
import { OrangeCapWidget, PurpleCapWidget } from '../../components/common/CapWidgets';
import { useSeasons } from '../../hooks/useSeasons';
import { useParentMatches } from '../../hooks/useMatches';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { usePlayers } from '../../hooks/usePlayers';
import { useMemo, useState, useEffect } from 'react';
import { Trophy, Target, Star, Activity, Shield, Users, BarChart3 } from 'lucide-react';

export function SeasonSummaryPage() {
  const { data: seasons = [] } = useSeasons();
  const { data: matches = [] } = useParentMatches();
  const { data: allStats = [] } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();
  const [selectedSeasonId, setSelectedSeasonId] = useState('');

  const season = seasons.find(s => s.id === selectedSeasonId);
  const activeSeason = seasons.find(s => s.is_active);

  useEffect(() => {
    if (!selectedSeasonId && activeSeason) {
      setSelectedSeasonId(activeSeason.id);
    }
  }, [selectedSeasonId, activeSeason]);

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map(p => [p.id, p.photo_url])), [players]);

  const seasonMatches = useMemo(() => {
    if (!selectedSeasonId) return [];
    return matches.filter(m => m.season_id === selectedSeasonId);
  }, [matches, selectedSeasonId]);

  const completed = useMemo(() => seasonMatches.filter(m => m.status === 'completed'), [seasonMatches]);
  const totalMatches = seasonMatches.length;
  const completedMatches = completed.length;

  const champion = useMemo(() => {
    if (completed.length === 0) return null;
    const lastMatch = completed[completed.length - 1];
    if (lastMatch.winner === 'team_a') return lastMatch.team_a_name;
    if (lastMatch.winner === 'team_b') return lastMatch.team_b_name;
    return null;
  }, [completed]);

  const runnerUp = useMemo(() => {
    if (completed.length === 0) return null;
    const lastMatch = completed[completed.length - 1];
    if (lastMatch.winner === 'team_a') return lastMatch.team_b_name;
    if (lastMatch.winner === 'team_b') return lastMatch.team_a_name;
    return null;
  }, [completed]);

  const stats = useMemo(() => {
    if (!selectedSeasonId) return null;
    const filtered = allStats.filter(s => s.season_id === selectedSeasonId);
    const topRuns = [...filtered].sort((a, b) => b.runs - a.runs)[0];
    const topWickets = [...filtered].sort((a, b) => b.wickets - a.wickets)[0];
    const potmCounts: Record<string, number> = {};
    for (const m of completed) {
      if (m.player_of_match_id) potmCounts[m.player_of_match_id] = (potmCounts[m.player_of_match_id] ?? 0) + 1;
    }
    const topPotm = Object.entries(potmCounts).sort(([, a], [, b]) => b - a)[0];

    let bestTeamRecord = { name: '', wins: 0 };
    const teamWins: Record<string, number> = {};
    for (const m of completed) {
      if (m.winner === 'team_a') teamWins[m.team_a_name] = (teamWins[m.team_a_name] ?? 0) + 1;
      if (m.winner === 'team_b') teamWins[m.team_b_name] = (teamWins[m.team_b_name] ?? 0) + 1;
    }
    for (const [name, wins] of Object.entries(teamWins)) {
      if (wins > bestTeamRecord.wins) bestTeamRecord = { name, wins };
    }

    return { topRuns, topWickets, topPotm, bestTeamRecord, teamWins, filteredStats: filtered };
  }, [allStats, selectedSeasonId, completed]);

  return (
    <div className="space-y-4">
      <PagePanel title="Season Summary">
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Select Season</label>
          <select
            value={selectedSeasonId}
            onChange={e => setSelectedSeasonId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">Choose a season</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Active)' : ''}</option>
            ))}
          </select>
        </div>

        {!selectedSeasonId && (
          <p className="text-center text-slate-400 py-8 text-sm">Select a season to view its summary.</p>
        )}

        {season && stats && (
          <>
            {/* Season Header */}
            <div className="rounded-xl bg-gradient-to-br from-teal-50 to-white border border-teal-200 p-5 mb-4">
              <h2 className="text-lg font-extrabold text-teal-800">{season.name}</h2>
              <p className="text-xs text-teal-600 mt-1">{season.start_date}{season.end_date ? ` — ${season.end_date}` : ''}</p>
            </div>

            {/* Champion & Runner Up */}
            <div className="grid grid-cols-2 gap-3 mb-4 stagger-enter">
              <GlassCard variant="light" glow="teal" className="p-4 text-center">
                <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Champion</p>
                <p className="text-lg font-extrabold text-amber-800 mt-1">{champion ?? 'TBD'}</p>
              </GlassCard>
              <GlassCard variant="light" className="p-4 text-center">
                <Shield className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Runner Up</p>
                <p className="text-lg font-extrabold text-slate-700 mt-1">{runnerUp ?? 'TBD'}</p>
              </GlassCard>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4 stagger-enter">
              <GlassCard variant="light" className="p-3 text-center">
                <BarChart3 className="w-4 h-4 text-teal-500 mx-auto mb-1" />
                <p className="text-xl font-extrabold text-slate-800 tabular-nums">{totalMatches}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Matches</p>
              </GlassCard>
              <GlassCard variant="light" className="p-3 text-center">
                <Activity className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                <p className="text-xl font-extrabold text-slate-800 tabular-nums">{completedMatches}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Completed</p>
              </GlassCard>
              <GlassCard variant="light" className="p-3 text-center">
                <Users className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                <p className="text-xl font-extrabold text-slate-800 tabular-nums">{Object.keys(stats.teamWins).length}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Teams</p>
              </GlassCard>
            </div>

            {/* Orange Cap & Purple Cap Widgets */}
            <div className="grid gap-3 sm:grid-cols-2 mb-4 stagger-enter">
              <OrangeCapWidget stats={stats.filteredStats} playerMap={playerMap} playerPhotoMap={playerPhotoMap} />
              <PurpleCapWidget stats={stats.filteredStats} playerMap={playerMap} playerPhotoMap={playerPhotoMap} />
            </div>

            {/* Award Cards */}
            {stats.topPotm && (
              <GlassCard variant="light" className="p-4 mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Most POTM</p>
                  <p className="font-bold text-slate-800 truncate">{playerMap.get(stats.topPotm[0]) ?? 'Unknown'}</p>
                  <p className="text-sm text-amber-600 font-semibold">{stats.topPotm[1]} awards</p>
                </div>
              </GlassCard>
            )}

            {stats.bestTeamRecord.name && (
              <GlassCard variant="light" className="p-4 mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Best Team Record</p>
                  <p className="font-bold text-slate-800 truncate">{stats.bestTeamRecord.name}</p>
                  <p className="text-sm text-teal-600 font-semibold">{stats.bestTeamRecord.wins} wins</p>
                </div>
              </GlassCard>
            )}
          </>
        )}
      </PagePanel>
    </div>
  );
}
