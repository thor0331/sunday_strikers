import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { useParentMatches } from '../../hooks/useMatches';
import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  const { data: matches = [], isLoading } = useParentMatches();
  const matchDay = matches.find((match) => ['scheduled', 'teams_created', 'toss_completed', 'in_progress'].includes(match.status));

  return (
    <div className="space-y-4">
      <PagePanel title="Admin Dashboard">
        <div className="grid gap-2">
          <Link to="/admin/matches/new">
            <Button className="w-full">Create Match</Button>
          </Link>
          <Link to="/admin/players">
            <Button variant="secondary" className="w-full">
              Manage Players
            </Button>
          </Link>
          <Link to="/admin/seasons">
            <Button variant="secondary" className="w-full">
              Manage Seasons
            </Button>
          </Link>
        </div>
      </PagePanel>
      <PagePanel title="Match Day">
        {isLoading ? <p>Loading matches...</p> : null}
        {matchDay ? (
          <div className="grid gap-3">
            <div>
              <h3 className="font-semibold">{matchDay.match_name}</h3>
              <p className="text-sm text-slate-500">
                {matchDay.match_date} - {matchDay.status}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link to={`/admin/matches/${matchDay.id}/teams`}>
                <Button variant="secondary" className="w-full">
                  Teams
                </Button>
              </Link>
              <Link to={`/admin/matches/${matchDay.id}/toss`}>
                <Button variant="secondary" className="w-full">
                  Toss
                </Button>
              </Link>
              <Link className="col-span-2" to={`/admin/matches/${matchDay.id}/scoring`}>
                <Button className="w-full">Scoring</Button>
              </Link>
            </div>
          </div>
        ) : (
          <p>No active match-day workflow.</p>
        )}
      </PagePanel>
    </div>
  );
}
