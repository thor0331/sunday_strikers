import { PagePanel } from '../../components/common/PagePanel';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useMemo } from 'react';

export function LeaderboardsPage() {
  const { data: statistics = [], isLoading, error } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();
  const playerNames = useMemo(() => new Map(players.map((player) => [player.id, player.display_name])), [players]);

  return (
    <PagePanel title="Leaderboards">
      {isLoading ? <p>Loading leaderboards...</p> : null}
      {error ? <p className="text-red-700">Unable to load leaderboards.</p> : null}
      <div className="grid gap-3">
        {statistics.slice(0, 10).map((row, index) => (
          <article key={row.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg border border-slate-200 p-3">
            <span className="font-bold text-field">{index + 1}</span>
            <div>
              <h3 className="font-semibold">{playerNames.get(row.player_id) ?? 'Player'}</h3>
              <p className="text-sm text-slate-500">
                {row.runs} runs - {row.wickets} wickets
              </p>
            </div>
            <span className="text-sm font-semibold">{row.matches_played} matches</span>
          </article>
        ))}
      </div>
    </PagePanel>
  );
}
