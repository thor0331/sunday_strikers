import { PagePanel } from '../../components/common/PagePanel';
import { usePlayers } from '../../hooks/usePlayers';

export function PlayersPage() {
  const { data: players = [], isLoading, error } = usePlayers();

  return (
    <PagePanel title="Players">
      {isLoading ? <p>Loading players...</p> : null}
      {error ? <p className="text-red-700">Unable to load players.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {players.map((player) => (
          <article key={player.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
              {player.photo_url ? <img src={player.photo_url} alt={player.display_name} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{player.display_name}</h3>
              <p className="text-sm text-slate-500">{player.batting_style || 'Batting style not set'}</p>
              <p className="text-sm text-slate-500">{player.bowling_style || 'Bowling style not set'}</p>
            </div>
          </article>
        ))}
      </div>
    </PagePanel>
  );
}
