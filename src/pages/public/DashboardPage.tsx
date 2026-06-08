import { PagePanel } from '../../components/common/PagePanel';
import { useParentMatches } from '../../hooks/useMatches';

export function DashboardPage() {
  const { data: matches = [], isLoading } = useParentMatches();
  const upcoming = matches.filter((match) => ['draft', 'scheduled', 'teams_created', 'toss_completed'].includes(match.status)).slice(0, 3);
  const completed = matches.filter((match) => match.status === 'completed').slice(0, 3);

  return (
    <div className="space-y-4">
      <PagePanel title="Upcoming">
        {isLoading ? <p>Loading matches...</p> : null}
        <div className="grid gap-2">
          {upcoming.map((match) => (
            <div key={match.id} className="rounded-md border border-slate-200 px-3 py-2">
              <p className="font-semibold">{match.match_name}</p>
              <p className="text-sm text-slate-500">
                {match.match_date} - {match.status}
              </p>
            </div>
          ))}
        </div>
      </PagePanel>
      <PagePanel title="Recent Results">
        <div className="grid gap-2">
          {completed.map((match) => (
            <div key={match.id} className="rounded-md border border-slate-200 px-3 py-2">
              <p className="font-semibold">{match.match_name}</p>
              <p className="text-sm text-slate-500">{match.result_text || 'Result recorded'}</p>
            </div>
          ))}
        </div>
      </PagePanel>
    </div>
  );
}
