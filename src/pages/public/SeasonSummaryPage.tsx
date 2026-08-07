import { PagePanel } from '../../components/common/PagePanel';
import { SelectField } from '../../components/forms/Field';
import { GlassCard } from '../../components/common/GlassCard';
import { OrangeCapWidget, PurpleCapWidget, type CapStatRow } from '../../components/common/CapWidgets';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { useSeasons } from '../../hooks/useSeasons';
import { useParentMatches } from '../../hooks/useMatches';
import { useAllBallEvents } from '../../hooks/useBallEvents';
import { usePlayers } from '../../hooks/usePlayers';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { useMemo, useState, useEffect } from 'react';
import { Trophy, Activity, Shield, Users, BarChart3, Crown, Flame, Zap, Handshake, History } from 'lucide-react';
import { aggregateBatting, aggregateBowling } from '../../utils/seasonStatistics';
import { computeHighestPartnership, computeBestBowlingFigures } from '../../utils/matchAnalytics';
import { CountUp } from '../../components/common/CountUp';
import { SkeletonCard } from '../../components/common/Skeleton';

export function SeasonSummaryPage() {
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons();
  const { data: matches = [], isLoading: matchesLoading } = useParentMatches();
  const { data: players = [] } = usePlayers();
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const avatarViewer = useAvatarViewerStore();

  const defaultSeasonId = useMemo(() => {
    if (seasons.length === 0) return '';
    const active = seasons.find((s) => s.is_active);
    if (active) return active.id;
    return [...seasons].sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))[0]?.id ?? '';
  }, [seasons]);

  useEffect(() => {
    if (!selectedSeasonId && defaultSeasonId) {
      setSelectedSeasonId(defaultSeasonId);
    }
  }, [selectedSeasonId, defaultSeasonId]);

  const season = seasons.find((s) => s.id === selectedSeasonId);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);

  const seasonMatches = useMemo(() => {
    if (!selectedSeasonId) return [];
    return matches.filter((m) => m.season_id === selectedSeasonId);
  }, [matches, selectedSeasonId]);

  const completed = useMemo(() => seasonMatches.filter((m) => m.status === 'completed'), [seasonMatches]);
  const totalMatches = seasonMatches.length;
  const completedMatches = completed.length;

  const completedMatchIds = useMemo(() => completed.map((m) => m.id), [completed]);
  const { data: allBallEvents = [], isLoading: eventsLoading } = useAllBallEvents(completedMatchIds);

  const battingAgg = useMemo(() => aggregateBatting(allBallEvents), [allBallEvents]);
  const bowlingAgg = useMemo(() => aggregateBowling(allBallEvents), [allBallEvents]);

  const topRuns = useMemo(() => (battingAgg.length > 0 ? battingAgg[0] : null), [battingAgg]);
  const topWickets = useMemo(() => (bowlingAgg.length > 0 ? bowlingAgg[0] : null), [bowlingAgg]);

  const capRows = useMemo<CapStatRow[]>(() => {
    const rows: CapStatRow[] = [];
    const seen = new Set<string>();
    for (const bat of battingAgg) {
      seen.add(bat.playerId);
      rows.push({ player_id: bat.playerId, runs: bat.runs, wickets: bowlingAgg.find((b) => b.playerId === bat.playerId)?.wickets ?? 0 });
    }
    for (const bowl of bowlingAgg) {
      if (!seen.has(bowl.playerId)) {
        rows.push({ player_id: bowl.playerId, runs: 0, wickets: bowl.wickets });
      }
    }
    return rows;
  }, [battingAgg, bowlingAgg]);

  const champion = useMemo(() => {
    if (completed.length === 0) return null;
    const lastMatch = completed[0];
    if (lastMatch.winner === 'team_a') return lastMatch.team_a_name;
    if (lastMatch.winner === 'team_b') return lastMatch.team_b_name;
    return null;
  }, [completed]);

  const runnerUp = useMemo(() => {
    if (completed.length === 0) return null;
    const lastMatch = completed[0];
    if (lastMatch.winner === 'team_a') return lastMatch.team_b_name;
    if (lastMatch.winner === 'team_b') return lastMatch.team_a_name;
    return null;
  }, [completed]);

  const topPotm = useMemo(() => {
    const potmCounts: Record<string, number> = {};
    for (const m of completed) {
      if (m.player_of_match_id) potmCounts[m.player_of_match_id] = (potmCounts[m.player_of_match_id] ?? 0) + 1;
    }
    const entries = Object.entries(potmCounts).sort(([, a], [, b]) => b - a);
    return entries[0] ?? null;
  }, [completed]);

  const teamStandings = useMemo(() => {
    const teamWins: Record<string, number> = {};
    for (const m of completed) {
      if (m.winner === 'team_a') teamWins[m.team_a_name] = (teamWins[m.team_a_name] ?? 0) + 1;
      if (m.winner === 'team_b') teamWins[m.team_b_name] = (teamWins[m.team_b_name] ?? 0) + 1;
    }
    let bestTeamRecord = { name: '', wins: 0 };
    for (const [name, wins] of Object.entries(teamWins)) {
      if (wins > bestTeamRecord.wins) bestTeamRecord = { name, wins };
    }
    return { teamWins, bestTeamRecord };
  }, [completed]);

  const liveTotals = useMemo(() => {
    let runs = 0;
    let wickets = 0;
    let fours = 0;
    let sixes = 0;
    for (const event of allBallEvents) {
      runs += event.runsBatter + event.runsExtra;
      if (event.isWicket) wickets += 1;
      if (event.runsBatter === 4) fours += 1;
      if (event.runsBatter === 6) sixes += 1;
    }
    return { runs, wickets, fours, sixes };
  }, [allBallEvents]);

  const mostSixes = useMemo(
    () => (battingAgg.length > 0 ? [...battingAgg].sort((a, b) => b.sixes - a.sixes)[0] : null),
    [battingAgg]
  );

  const topPartnership = useMemo(() => {
    const byInnings = new Map<string, typeof allBallEvents>();
    for (const event of allBallEvents) {
      const list = byInnings.get(event.inningsId) ?? [];
      list.push(event);
      byInnings.set(event.inningsId, list);
    }
    let best: { runs: number; balls: number; b1: string; b2: string } | null = null;
    for (const events of byInnings.values()) {
      const part = computeHighestPartnership(events);
      if (part && (!best || part.runs > best.runs)) best = part;
    }
    return best;
  }, [allBallEvents]);

  const bestBowling = useMemo(() => computeBestBowlingFigures(allBallEvents), [allBallEvents]);

  const currentMvp = useMemo(() => {
    const potmCounts: Record<string, number> = {};
    for (const m of completed) {
      if (m.player_of_match_id) potmCounts[m.player_of_match_id] = (potmCounts[m.player_of_match_id] ?? 0) + 1;
    }
    const battingById = new Map(battingAgg.map((s) => [s.playerId, s]));
    const bowlingById = new Map(bowlingAgg.map((s) => [s.playerId, s]));
    let best = { playerId: '', score: -1 };
    const ids = new Set([...battingById.keys(), ...bowlingById.keys(), ...Object.keys(potmCounts)]);
    for (const id of ids) {
      const score =
        (battingById.get(id)?.runs ?? 0) +
        (bowlingById.get(id)?.wickets ?? 0) * 15 +
        (potmCounts[id] ?? 0) * 30;
      if (score > best.score) best = { playerId: id, score };
    }
    return best.score >= 0 && best.playerId ? best : null;
  }, [battingAgg, bowlingAgg, completed]);

  const recentForm = useMemo(() => {
    return [...completed]
      .sort((a, b) => b.match_date.localeCompare(a.match_date))
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        name: `${m.team_a_name} vs ${m.team_b_name}`,
        won: m.winner === 'team_a' ? m.team_a_name : m.winner === 'team_b' ? m.team_b_name : null,
      }));
  }, [completed]);

  if (seasonsLoading || matchesLoading || eventsLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid gap-3 sm:grid-cols-3">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PagePanel title="Season Summary">
        <div className="mb-4">
          <SelectField
            label="Select Season"
            value={selectedSeasonId}
            onChange={e => setSelectedSeasonId(e.target.value)}
          >
            <option value="">Choose a season</option>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Active)' : ''}</option>
            ))}
          </SelectField>
        </div>

        {seasons.length === 0 && (
          <p className="text-center text-slate-300 py-8 text-sm">No seasons available yet.</p>
        )}

        {season && (
          <>
            {/* Season Header */}
            <div className="rounded-xl bg-teal-400/10 border border-teal-400/20 p-5 mb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-extrabold text-teal-200">{season.name}</h2>
                  <p className="text-xs text-teal-300/80 mt-1">{season.start_date}{season.end_date ? ` — ${season.end_date}` : ''}</p>
                </div>
                {season.is_active && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-400/30 px-2.5 py-1 text-[10px] font-bold text-red-300 animate-live-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
            </div>

            {/* LIVE Summary — active seasons always populated */}
            {season.is_active && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-400 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-200">Live Season Summary</p>
                  <span className="text-[10px] text-slate-400">Updated with every completed match</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <LiveStat label="Matches Played" value={completedMatches} icon={<Users className="w-4 h-4" />} accent="text-white" />
                  <LiveStat label="Runs" value={liveTotals.runs} icon={<BarChart3 className="w-4 h-4" />} accent="text-emerald-400" />
                  <LiveStat label="Wickets" value={liveTotals.wickets} icon={<Shield className="w-4 h-4" />} accent="text-red-400" />
                  <LiveStat label="Boundaries" value={`${liveTotals.fours} / ${liveTotals.sixes}`} icon={<Flame className="w-4 h-4" />} accent="text-amber-400" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topRuns && (
                    <LivePlayerCard
                      label="Most Runs"
                      playerName={playerMap.get(topRuns.playerId) ?? 'Unknown'}
                      value={`${topRuns.runs} runs`}
                      badge="Orange Cap"
                      photo={playerPhotoMap.get(topRuns.playerId) ?? null}
                      accent="text-emerald-400"
                    />
                  )}
                  {topWickets && (
                    <LivePlayerCard
                      label="Most Wickets"
                      playerName={playerMap.get(topWickets.playerId) ?? 'Unknown'}
                      value={`${topWickets.wickets} wickets`}
                      badge="Purple Cap"
                      photo={playerPhotoMap.get(topWickets.playerId) ?? null}
                      accent="text-purple-400"
                    />
                  )}
                  {currentMvp && (
                    <LivePlayerCard
                      label="Current MVP"
                      playerName={playerMap.get(currentMvp.playerId) ?? 'Unknown'}
                      value={`${currentMvp.score} pts`}
                      badge="🏆 MVP"
                      photo={playerPhotoMap.get(currentMvp.playerId) ?? null}
                      accent="text-amber-400"
                    />
                  )}
                  {mostSixes && mostSixes.sixes > 0 && (
                    <LivePlayerCard
                      label="Most Sixes"
                      playerName={playerMap.get(mostSixes.playerId) ?? 'Unknown'}
                      value={`${mostSixes.sixes} sixes`}
                      badge="💥"
                      photo={playerPhotoMap.get(mostSixes.playerId) ?? null}
                      accent="text-orange-400"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topPartnership && (
                    <GlassCard variant="light" className="p-3.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Handshake className="w-4 h-4 text-pink-400" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Top Partnership</p>
                      </div>
                      <p className="text-sm font-bold text-white truncate">
                        {playerMap.get(topPartnership.b1) ?? 'Batter 1'} & {playerMap.get(topPartnership.b2) ?? 'Batter 2'}
                      </p>
                      <p className="text-sm font-semibold text-pink-300 tabular-nums">{topPartnership.runs} runs · {topPartnership.balls} balls</p>
                    </GlassCard>
                  )}
                  {bestBowling && (
                    <GlassCard variant="light" className="p-3.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Best Bowling</p>
                      </div>
                      <p className="text-sm font-bold text-white truncate">{playerMap.get(bestBowling.playerId) ?? 'Bowler'}</p>
                      <p className="text-sm font-semibold text-cyan-300 tabular-nums">{bestBowling.wickets}/{bestBowling.runsConceded}</p>
                    </GlassCard>
                  )}
                </div>

                {recentForm.length > 0 && (
                  <GlassCard variant="light" className="p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="w-4 h-4 text-teal-400" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Recent Form</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentForm.map((m) => (
                        <span
                          key={m.id}
                          title={m.name}
                          className={`inline-flex h-7 w-9 items-center justify-center rounded-lg text-xs font-extrabold ${
                            m.won
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {m.won ? 'W' : 'L'}
                        </span>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {completedMatches === 0 && (
                  <p className="text-center text-xs text-slate-400 py-1">
                    No completed matches yet — live stats will appear as matches finish.
                  </p>
                )}
              </div>
            )}

            {/* Champion Banner (completed seasons only) */}
            {champion && !season.is_active && (
              <GlassCard variant="dark" glow="orange" className="relative overflow-hidden p-5 mb-4">
                <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-600/10 blur-2xl" />
                <div className="relative flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xl shadow-amber-500/30">
                    <Crown className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Season Champion</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-white truncate">{champion}</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {runnerUp ? `${runnerUp} runner-up` : 'Championship decided'}
                    </p>
                  </div>
                </div>
                <div className="relative mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 text-[10px] font-bold text-amber-200">
                    🏆 {teamStandings.bestTeamRecord.name === champion ? `${teamStandings.bestTeamRecord.wins} wins` : 'Champions'}
                  </span>
                </div>
              </GlassCard>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 stagger-enter">
              <GlassCard variant="light" className="p-3 text-center">
                <BarChart3 className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                <p className="text-xl font-extrabold text-white tabular-nums animate-count-up">{totalMatches}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Total Matches</p>
              </GlassCard>
              <GlassCard variant="light" className="p-3 text-center">
                <Activity className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-extrabold text-white tabular-nums animate-count-up">{completedMatches}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Completed</p>
              </GlassCard>
              <GlassCard variant="light" className="p-3 text-center">
                <Users className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <p className="text-xl font-extrabold text-white tabular-nums animate-count-up">{Object.keys(teamStandings.teamWins).length}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300">Teams</p>
              </GlassCard>
            </div>

            {/* Team Standings */}
            {Object.keys(teamStandings.teamWins).length > 0 && (
              <GlassCard variant="light" className="p-4 mb-4 stagger-enter">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Team Wins</p>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(teamStandings.teamWins)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, wins], index) => {
                      const max = Math.max(...Object.values(teamStandings.teamWins), 1);
                      const pct = (wins / max) * 100;
                      const isChamp = name === champion;
                      return (
                        <div key={name} className="flex items-center gap-3">
                          <span className="w-5 text-center text-xs font-bold text-slate-300 tabular-nums">{index + 1}</span>
                          <span className={`w-24 sm:w-32 truncate text-xs font-semibold ${isChamp ? 'text-amber-300' : 'text-slate-100'}`}>{name}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isChamp
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                                  : index === 1
                                    ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                                    : 'bg-gradient-to-r from-teal-400 to-teal-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-xs font-bold text-white tabular-nums">{wins}</span>
                        </div>
                      );
                    })}
                </div>
              </GlassCard>
            )}

            {/* Orange Cap & Purple Cap Widgets */}
            <div className="grid gap-3 sm:grid-cols-2 mb-4 stagger-enter">
              <OrangeCapWidget stats={capRows} playerMap={playerMap} playerPhotoMap={playerPhotoMap} />
              <PurpleCapWidget stats={capRows} playerMap={playerMap} playerPhotoMap={playerPhotoMap} />
            </div>

            {/* Top Awards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 stagger-enter">
              {topRuns && (
                <GlassCard variant="light" hover className="p-4 flex items-center gap-3">
                  <CircularAvatar
                    src={playerPhotoMap.get(topRuns.playerId) ?? null}
                    alt={playerMap.get(topRuns.playerId) ?? 'Top Run Scorer'}
                    size="md"
                    onClick={playerPhotoMap.get(topRuns.playerId)
                      ? () => avatarViewer.open(playerPhotoMap.get(topRuns.playerId)!, playerMap.get(topRuns.playerId) ?? '')
                      : undefined}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Top Run Scorer</p>
                    <p className="font-bold text-white truncate">{playerMap.get(topRuns.playerId) ?? 'Unknown'}</p>
                    <p className="text-sm text-emerald-400 font-semibold">{topRuns.runs} runs</p>
                  </div>
                </GlassCard>
              )}
              {topWickets && (
                <GlassCard variant="light" hover className="p-4 flex items-center gap-3">
                  <CircularAvatar
                    src={playerPhotoMap.get(topWickets.playerId) ?? null}
                    alt={playerMap.get(topWickets.playerId) ?? 'Top Wicket Taker'}
                    size="md"
                    onClick={playerPhotoMap.get(topWickets.playerId)
                      ? () => avatarViewer.open(playerPhotoMap.get(topWickets.playerId)!, playerMap.get(topWickets.playerId) ?? '')
                      : undefined}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Top Wicket Taker</p>
                    <p className="font-bold text-white truncate">{playerMap.get(topWickets.playerId) ?? 'Unknown'}</p>
                    <p className="text-sm text-purple-400 font-semibold">{topWickets.wickets} wickets</p>
                  </div>
                </GlassCard>
              )}
            </div>

            {/* Award Cards */}
            {topPotm && (
              <GlassCard variant="light" className="p-4 mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Most POTM</p>
                  <p className="font-bold text-white truncate">{playerMap.get(topPotm[0]) ?? 'Unknown'}</p>
                  <p className="text-sm text-amber-400 font-semibold">{topPotm[1]} awards</p>
                </div>
              </GlassCard>
            )}

            {teamStandings.bestTeamRecord.name && (
              <GlassCard variant="light" className="p-4 mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Best Team Record</p>
                  <p className="font-bold text-white truncate">{teamStandings.bestTeamRecord.name}</p>
                  <p className="text-sm text-teal-400 font-semibold">{teamStandings.bestTeamRecord.wins} wins</p>
                </div>
              </GlassCard>
            )}
          </>
        )}
      </PagePanel>
    </div>
  );
}

function LiveStat({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent: string }) {
  return (
    <GlassCard variant="light" className="p-3 text-center">
      <span className="mx-auto mb-1 inline-flex text-slate-400">{icon}</span>
      <p className={`text-xl font-extrabold tabular-nums ${accent}`}>
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">{label}</p>
    </GlassCard>
  );
}

function LivePlayerCard({
  label,
  playerName,
  value,
  badge,
  photo,
  accent,
}: {
  label: string;
  playerName: string;
  value: string;
  badge: string;
  photo: string | null;
  accent: string;
}) {
  const avatarViewer = useAvatarViewerStore();
  return (
    <GlassCard variant="light" hover className="p-3.5 flex items-center gap-3">
      <CircularAvatar
        src={photo}
        alt={playerName}
        size="md"
        onClick={photo ? () => avatarViewer.open(photo, playerName) : undefined}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{label}</p>
        <p className="truncate text-sm font-bold text-white">{playerName}</p>
        <p className={`text-sm font-semibold tabular-nums ${accent}`}>{value}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] font-bold text-white">
        {badge}
      </span>
    </GlassCard>
  );
}
