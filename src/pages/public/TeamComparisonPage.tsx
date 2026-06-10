import { PagePanel } from '../../components/common/PagePanel';
import { useParentMatches } from '../../hooks/useMatches';
import { useMemo, useState } from 'react';
import { computeHeadToHead, computeTeamStats } from '../../utils/analytics';
import { Link } from 'react-router-dom';

export function TeamComparisonPage() {
  const { data: matches = [] } = useParentMatches();
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');

  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    matches.forEach(m => { teams.add(m.team_a_name); teams.add(m.team_b_name); });
    return Array.from(teams).sort();
  }, [matches]);

  const completedMatches = useMemo(() => matches.filter(m => m.status === 'completed'), [matches]);

  const filteredMatches = useMemo(() => {
    if (!teamA || !teamB) return [];
    return completedMatches.filter(m =>
      (m.team_a_name === teamA && m.team_b_name === teamB) ||
      (m.team_a_name === teamB && m.team_b_name === teamA)
    );
  }, [completedMatches, teamA, teamB]);

  const statsA = useMemo(() => {
    if (!teamA) return null;
    return computeTeamStats(filteredMatches.filter(m => m.team_a_name === teamA || m.team_b_name === teamA), 'team_a');
  }, [filteredMatches, teamA]);

  const statsB = useMemo(() => {
    if (!teamB) return null;
    return computeTeamStats(filteredMatches.filter(m => m.team_b_name === teamB || m.team_a_name === teamB), 'team_b');
  }, [filteredMatches, teamB]);

  const h2h = useMemo(() => {
    if (!teamA || !teamB) return null;
    return computeHeadToHead(completedMatches, teamA, teamB);
  }, [completedMatches, teamA, teamB]);

  const recentMeetings = useMemo(() => {
    if (!teamA || !teamB) return [];
    return filteredMatches.slice(0, 5);
  }, [filteredMatches, teamA, teamB]);

  return (
    <div className="space-y-4">
      <PagePanel title="Team Comparison">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Team A</label>
            <select
              value={teamA}
              onChange={e => setTeamA(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Select team</option>
              {uniqueTeams.map(t => <option key={t} value={t} disabled={t === teamB}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Team B</label>
            <select
              value={teamB}
              onChange={e => setTeamB(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Select team</option>
              {uniqueTeams.map(t => <option key={t} value={t} disabled={t === teamA}>{t}</option>)}
            </select>
          </div>
        </div>

        {h2h && teamA && teamB ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-600">{teamA}</p>
                <p className="text-3xl font-extrabold text-teal-700 mt-1">{statsA?.wins ?? 0}</p>
                <p className="text-xs text-teal-600/70">Wins</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{teamB}</p>
                <p className="text-3xl font-extrabold text-blue-700 mt-1">{statsB?.wins ?? 0}</p>
                <p className="text-xs text-blue-600/70">Wins</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-700">Head to Head</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2">
                  <p className="text-2xl font-bold text-slate-800">{h2h.matchesPlayed}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Matches</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl font-bold text-teal-600">{h2h.teamAWins}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{teamA} Wins</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl font-bold text-blue-600">{h2h.teamBWins}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{teamB} Wins</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl font-bold text-slate-600">{h2h.draws}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Draws</p>
                </div>
              </div>
            </div>

            {recentMeetings.length > 0 && (
              <div className="space-y-2 mt-3">
                <h3 className="text-sm font-bold text-slate-700">Recent Meetings</h3>
                {recentMeetings.map(m => {
                  const isTeamAWinner = (m.team_a_name === teamA && m.winner === 'team_a') || (m.team_b_name === teamA && m.winner === 'team_b');
                  return (
                    <Link key={m.id} to={`/matches/${m.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-teal-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{m.match_name}</p>
                          <p className="text-xs text-slate-500">{m.match_date}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isTeamAWinner ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isTeamAWinner ? `${teamA} won` : `${teamB} won`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-slate-400 py-8 text-sm">Select two teams to compare their head-to-head records.</p>
        )}
      </PagePanel>
    </div>
  );
}
