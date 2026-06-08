import { PagePanel } from '../../components/common/PagePanel';
import { useMatch } from '../../hooks/useMatches';
import { useParams } from 'react-router-dom';

export function MatchSummaryPage() {
  const { matchId = '' } = useParams();
  const { data: match, isLoading, error } = useMatch(matchId);

  return (
    <PagePanel title="Match Summary">
      {isLoading ? <p>Loading match...</p> : null}
      {error ? <p className="text-red-700">Unable to load match.</p> : null}
      {match ? (
        <div className="grid gap-2">
          <h3 className="text-lg font-bold">{match.match_name}</h3>
          <p className="text-sm text-slate-600">{match.match_date}</p>
          <p>
            {match.team_a_name} vs {match.team_b_name}
          </p>
          <p className="font-semibold">{match.result_text || match.status}</p>
          {match.notes ? <p className="text-sm text-slate-600">{match.notes}</p> : null}
        </div>
      ) : null}
    </PagePanel>
  );
}
