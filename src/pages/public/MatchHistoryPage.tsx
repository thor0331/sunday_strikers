import { PagePanel } from '../../components/common/PagePanel';
import { MatchHistoryRow } from '../../components/matches/MatchHistoryRow';
import { useMatchHistory } from '../../hooks/useMatches';

export function MatchHistoryPage() {
  const { data: history = [], isLoading, error } = useMatchHistory();

  return (
    <PagePanel title="Match History">
      {isLoading ? <p>Loading matches...</p> : null}
      {error ? <p className="text-red-700">Unable to load match history.</p> : null}
      <div className="grid gap-3">
        {history.map((item) => (
          <MatchHistoryRow key={item.match.id} item={item} />
        ))}
      </div>
    </PagePanel>
  );
}
