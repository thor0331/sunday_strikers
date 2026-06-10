import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useParentMatches, useDeleteMatch, useResetMatch } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useSeasons } from '../../hooks/useSeasons';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';

export function AdminDashboardPage() {
  const { data: matches = [], isLoading: matchesLoading } = useParentMatches();
  const { data: players = [], isLoading: playersLoading } = usePlayers();
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons();

  const deleteMatch = useDeleteMatch();
  const resetMatch = useResetMatch();

  // Find active match day workflow (first scheduled/teams_created/toss_completed/in_progress match)
  const matchDay = useMemo(() => {
    return matches.find((match) => ['scheduled', 'teams_created', 'toss_completed', 'in_progress'].includes(match.status));
  }, [matches]);

  // Statistics calculation
  const totalPlayers = players.length;
  const totalSeasons = seasons.length;
  const totalMatches = matches.length;
  const completedMatches = useMemo(() => matches.filter((m) => m.status === 'completed').length, [matches]);
  const ongoingMatches = useMemo(() => matches.filter((m) => m.status === 'in_progress').length, [matches]);

  const isLoading = matchesLoading || playersLoading || seasonsLoading;

  async function handleDeleteMatch(matchId: string, matchName: string) {
    if (window.confirm(`Are you sure you want to delete match "${matchName}"?\n\nThis will permanently delete the match and all its scoring, innings, team selections, and availability records.`)) {
      await deleteMatch.mutateAsync(matchId);
    }
  }

  async function handleResetMatch(matchId: string, matchName: string) {
    if (window.confirm(`Are you sure you want to reset match "${matchName}"?\n\nThis will delete all innings and ball events, and reset the match status back to pre-toss state. Teams and captains will remain intact.`)) {
      await resetMatch.mutateAsync(matchId);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          <p className="text-slate-500 font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      {/* 1. Statistics Cards Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Players */}
        <div className="p-4 rounded-xl border border-teal-700 bg-slate-800 shadow-sm flex flex-col justify-between h-28 hover:shadow-md hover:border-teal-600 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Players</span>
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="text-3xl font-extrabold text-teal-300">{totalPlayers}</span>
        </div>

        {/* Card 2: Total Seasons */}
        <div className="p-4 rounded-xl border border-teal-700 bg-slate-800 shadow-sm flex flex-col justify-between h-28 hover:shadow-md hover:border-teal-600 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Seasons</span>
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-3xl font-extrabold text-teal-300">{totalSeasons}</span>
        </div>

        {/* Card 3: Total Matches */}
        <div className="p-4 rounded-xl border border-teal-700 bg-slate-800 shadow-sm flex flex-col justify-between h-28 hover:shadow-md hover:border-teal-600 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Matches</span>
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-3xl font-extrabold text-teal-300">{totalMatches}</span>
        </div>

        {/* Card 4: Completed Matches */}
        <div className="p-4 rounded-xl border border-teal-700 bg-slate-800 shadow-sm flex flex-col justify-between h-28 hover:shadow-md hover:border-teal-600 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Completed</span>
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-3xl font-extrabold text-teal-300">{completedMatches}</span>
        </div>

        {/* Card 5: Ongoing Matches */}
        <div className="p-4 rounded-xl border border-teal-700 bg-slate-800 shadow-sm flex flex-col justify-between h-28 hover:shadow-md hover:border-teal-600 transition-all col-span-2 sm:col-span-1">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Ongoing</span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
            </span>
          </div>
          <span className="text-3xl font-extrabold text-teal-300">{ongoingMatches}</span>
        </div>
      </section>

      {/* 2. Operations Menu Panel */}
      <PagePanel title="Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/admin/matches/new" className="w-full">
            <Button className="w-full">Create Match</Button>
          </Link>
          <Link to="/admin/players" className="w-full">
            <Button variant="secondary" className="w-full">Manage Players</Button>
          </Link>
          <Link to="/admin/seasons" className="w-full">
            <Button variant="secondary" className="w-full">Manage Seasons</Button>
          </Link>
        </div>
      </PagePanel>

      {/* Mutation Status for Match operations */}
      <MutationStatus
        error={deleteMatch.error || resetMatch.error}
        success={deleteMatch.isSuccess ? 'Match deleted successfully.' : resetMatch.isSuccess ? 'Match reset successfully.' : null}
      />

      {/* 3. Match Day Active Workflow */}
      <PagePanel title="Match Day">
        {matchDay ? (
          <div className="bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-500/20 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-100">{matchDay.match_name}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {matchDay.match_date} &bull; {matchDay.venue || 'No Venue'} &bull; {matchDay.overs_per_innings} overs
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 capitalize">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                  {matchDay.status.replace('_', ' ')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Link to={`/admin/matches/${matchDay.id}/teams`} className="flex-1 sm:flex-none">
                  <Button variant="secondary" className="w-full text-sm">Teams</Button>
                </Link>
                <Link to={`/admin/matches/${matchDay.id}/toss`} className="flex-1 sm:flex-none">
                  <Button variant="secondary" className="w-full text-sm">Toss</Button>
                </Link>
                <Link to={`/admin/matches/${matchDay.id}/scoring`} className="w-full sm:w-auto">
                  <Button className="w-full text-sm">Scoring Console</Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 py-6 text-center rounded-xl border border-dashed border-slate-700/50 bg-slate-800/30">
            <p>No active match-day workflow.</p>
          </div>
        )}
      </PagePanel>

      {/* 4. Manage Matches List */}
      <PagePanel title="Manage Matches">
        {matches.length === 0 ? (
          <p className="text-slate-400 py-6 text-center">No matches created yet.</p>
        ) : (
          <div className="grid gap-4">
            {matches.map((match) => {
              const canEdit = ['draft', 'scheduled', 'teams_created'].includes(match.status);
              const canReset = ['toss_completed', 'in_progress', 'completed'].includes(match.status);

              let badgeColor = 'bg-slate-700 text-slate-300';
              if (match.status === 'scheduled') badgeColor = 'bg-blue-500/20 text-blue-300';
              if (match.status === 'teams_created') badgeColor = 'bg-indigo-500/20 text-indigo-300';
              if (match.status === 'toss_completed') badgeColor = 'bg-purple-500/20 text-purple-300';
              if (match.status === 'in_progress') badgeColor = 'bg-amber-500/20 text-amber-300';
              if (match.status === 'completed') badgeColor = 'bg-emerald-500/20 text-emerald-300';
              if (match.status === 'abandoned') badgeColor = 'bg-red-500/20 text-red-300';

              return (
                <article key={match.id} className="group rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 hover:border-slate-600/60 hover:bg-slate-800/80 transition-all duration-200 hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-100 text-base truncate group-hover:text-teal-400 transition-colors">{match.match_name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${badgeColor}`}>
                        {match.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {match.match_date} &bull; {match.venue || 'No Venue'} &bull; {match.overs_per_innings} overs &bull; {match.players_per_team} players
                    </p>
                    <p className="text-xs text-slate-500">
                      {match.team_a_name} vs {match.team_b_name}
                    </p>
                  </div>
                  
                  {/* Actions Grid */}
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {/* Setup buttons based on current state */}
                    {['draft', 'scheduled'].includes(match.status) && (
                      <Link to={`/admin/matches/${match.id}/teams`} className="flex-1 md:flex-none">
                        <Button variant="secondary" className="w-full py-1.5 px-3 text-xs">Setup Teams</Button>
                      </Link>
                    )}
                    {match.status === 'teams_created' && (
                      <Link to={`/admin/matches/${match.id}/toss`} className="flex-1 md:flex-none">
                        <Button variant="secondary" className="w-full py-1.5 px-3 text-xs">Conduct Toss</Button>
                      </Link>
                    )}
                    {['toss_completed', 'in_progress'].includes(match.status) && (
                      <Link to={`/admin/matches/${match.id}/scoring`} className="flex-1 md:flex-none">
                        <Button className="w-full py-1.5 px-3 text-xs">Score</Button>
                      </Link>
                    )}
                    
                    {/* View Details button - for completed matches */}
                    {match.status === 'completed' && (
                      <Link to={`/admin/matches/${match.id}/details`} className="flex-1 md:flex-none">
                        <Button 
                          variant="secondary"
                          className="w-full py-1.5 px-3 text-xs"
                          title="View match scorecard and details"
                        >
                          View Details
                        </Button>
                      </Link>
                    )}
                    
                    {/* Edit button */}
                    <Link to={`/admin/matches/${match.id}/edit`} className="flex-1 md:flex-none">
                      <Button 
                        variant="secondary" 
                        disabled={!canEdit} 
                        className="w-full py-1.5 px-3 text-xs"
                        title={canEdit ? 'Edit Match details' : 'Cannot edit match after scoring has begun'}
                      >
                        Edit
                      </Button>
                    </Link>
                    
                    {/* Reset button */}
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canReset || resetMatch.isPending}
                      onClick={() => handleResetMatch(match.id, match.match_name)}
                      className="flex-1 md:flex-none py-1.5 px-3 text-xs text-amber-400 hover:text-amber-300 disabled:text-slate-500"
                    >
                      Reset
                    </Button>
                    
                    {/* Delete button */}
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deleteMatch.isPending}
                      onClick={() => handleDeleteMatch(match.id, match.match_name)}
                      className="flex-1 md:flex-none py-1.5 px-3 text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PagePanel>
    </div>
  );
}
