import { PagePanel } from '../../components/common/PagePanel';
import { useSeasons } from '../../hooks/useSeasons';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { usePlayers } from '../../hooks/usePlayers';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '../../components/common/Skeleton';

export function SeasonsPage() {
  const { data: seasons = [], isLoading, error } = useSeasons();
  const { data: allStats = [] } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map(p => [p.id, p.photo_url])), [players]);

  function getSeasonCapWidgets(seasonId: string | null) {
    const stats = allStats.filter(s => s.season_id === seasonId);
    const topRuns = [...stats].sort((a, b) => b.runs - a.runs)[0];
    const topWickets = [...stats].sort((a, b) => b.wickets - a.wickets)[0];
    return { topRuns, topWickets };
  }

  return (
    <PagePanel title="Seasons">
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-400">Unable to load seasons.</p>
      ) : (
        <>
          <div className="mb-3 flex gap-2">
            <Link to="/awards" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-teal-300 transition-colors hover:bg-white/15">
              🏆 Season Awards
            </Link>
            <Link to="/season-summary" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-purple-300 transition-colors hover:bg-white/15">
              📊 Season Summary
            </Link>
          </div>
          <div className="grid gap-3 stagger-enter">
        {seasons.map((season) => {
          const { topRuns, topWickets } = getSeasonCapWidgets(season.id);
          return (
            <article key={season.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-white">{season.name}</h3>
                  <p className="text-sm text-slate-300">
                    {season.start_date} {season.end_date ? `to ${season.end_date}` : ''}
                  </p>
                </div>
                {season.is_active ? <span className="rounded-md bg-teal-500/15 border border-teal-500/30 px-2 py-1 text-xs font-semibold text-teal-300">Active</span> : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-orange-300">Orange Cap</p>
                  {topRuns ? (
                    <div>
                      <p className="truncate text-sm font-bold text-white">{playerMap.get(topRuns.player_id) ?? 'Unknown'}</p>
                      <p className="text-xs font-semibold text-orange-300">{topRuns.runs} runs</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No data</p>
                  )}
                </div>
                <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-purple-300">Purple Cap</p>
                  {topWickets ? (
                    <div>
                      <p className="truncate text-sm font-bold text-white">{playerMap.get(topWickets.player_id) ?? 'Unknown'}</p>
                      <p className="text-xs font-semibold text-purple-300">{topWickets.wickets} wkts</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No data</p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
          </div>
        </>
      )}
    </PagePanel>
  );
}
