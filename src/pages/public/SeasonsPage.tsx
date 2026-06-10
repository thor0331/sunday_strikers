import { PagePanel } from '../../components/common/PagePanel';
import { useSeasons } from '../../hooks/useSeasons';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { usePlayers } from '../../hooks/usePlayers';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

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
      {isLoading ? <p>Loading seasons...</p> : null}
      {error ? <p className="text-red-700">Unable to load seasons.</p> : null}
      <div className="mb-3 flex gap-2">
        <Link to="/awards" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors">
          🏆 Season Awards
        </Link>
        <Link to="/season-summary" className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors">
          📊 Season Summary
        </Link>
      </div>
      <div className="grid gap-3">
        {seasons.map((season) => {
          const { topRuns, topWickets } = getSeasonCapWidgets(season.id);
          return (
            <article key={season.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold">{season.name}</h3>
                  <p className="text-sm text-slate-500">
                    {season.start_date} {season.end_date ? `to ${season.end_date}` : ''}
                  </p>
                </div>
                {season.is_active ? <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">Active</span> : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-orange-600">Orange Cap</p>
                  {topRuns ? (
                    <div>
                      <p className="text-sm font-bold text-slate-800 truncate">{playerMap.get(topRuns.player_id) ?? 'Unknown'}</p>
                      <p className="text-xs text-orange-600 font-semibold">{topRuns.runs} runs</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No data</p>
                  )}
                </div>
                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-purple-600">Purple Cap</p>
                  {topWickets ? (
                    <div>
                      <p className="text-sm font-bold text-slate-800 truncate">{playerMap.get(topWickets.player_id) ?? 'Unknown'}</p>
                      <p className="text-xs text-purple-600 font-semibold">{topWickets.wickets} wkts</p>
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
    </PagePanel>
  );
}
