import { PagePanel } from '../../components/common/PagePanel';
import { SelectField } from '../../components/forms/Field';
import { useParentMatches, useInningsByMatches } from '../../hooks/useMatches';
import { useAllBallEvents } from '../../hooks/useBallEvents';
import { useMemo, useState } from 'react';
import { computeHeadToHead, computeTeamStats } from '../../utils/analytics';
import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';

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

  const h2hMatchIds = useMemo(() => filteredMatches.map(m => m.id), [filteredMatches]);
  const { data: innings = [] } = useInningsByMatches(h2hMatchIds);
  const { data: allBallEvents = [] } = useAllBallEvents(h2hMatchIds);

  const statsA = useMemo(() => {
    if (!teamA) return null;
    return computeTeamStats(filteredMatches, teamA, innings, allBallEvents);
  }, [filteredMatches, teamA, innings, allBallEvents]);

  const statsB = useMemo(() => {
    if (!teamB) return null;
    return computeTeamStats(filteredMatches, teamB, innings, allBallEvents);
  }, [filteredMatches, teamB, innings, allBallEvents]);

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
            <SelectField
              label="Team A"
              value={teamA}
              onChange={e => setTeamA(e.target.value)}
            >
              <option value="">Select team</option>
              {uniqueTeams.map(t => <option key={t} value={t} disabled={t === teamB}>{t}</option>)}
            </SelectField>
          </div>
          <div>
            <SelectField
              label="Team B"
              value={teamB}
              onChange={e => setTeamB(e.target.value)}
            >
              <option value="">Select team</option>
              {uniqueTeams.map(t => <option key={t} value={t} disabled={t === teamA}>{t}</option>)}
            </SelectField>
          </div>
        </div>

        {h2h && teamA && teamB ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-teal-400/30 bg-teal-400/10 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-teal-400">{teamA}</p>
                <p className="text-3xl font-extrabold text-teal-300 mt-1">{h2h.teamAWins}</p>
                <p className="text-xs text-teal-400">Wins</p>
              </div>
              <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-sky-400">{teamB}</p>
                <p className="text-3xl font-extrabold text-sky-300 mt-1">{h2h.teamBWins}</p>
                <p className="text-xs text-sky-400">Wins</p>
              </div>
            </div>

            {/* Win Percentage Bar */}
            {h2h.matchesPlayed > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold text-teal-400">{teamA}</span>
                  <span className="font-semibold text-sky-400">{teamB}</span>
                </div>
                <div className="h-3 rounded-full bg-white/[0.05] overflow-hidden flex">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all" style={{ width: `${h2h.teamAWinPercentage}%` }} />
                  <div className="h-full bg-gradient-to-l from-blue-500 to-blue-400 transition-all" style={{ width: `${h2h.teamBWinPercentage}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{h2h.teamAWinPercentage}%</span>
                  <span>{h2h.matchesPlayed} matches</span>
                  <span>{h2h.teamBWinPercentage}%</span>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/10 p-4 space-y-3">
              <h3 className="text-sm font-bold text-slate-200">Head to Head</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2">
                  <p className="text-2xl font-bold text-slate-100">{h2h.matchesPlayed}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Matches</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl font-bold text-teal-400">{h2h.teamAWins}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{teamA} Wins</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl font-bold text-sky-400">{h2h.teamBWins}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{teamB} Wins</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl font-bold text-slate-300">{h2h.draws}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Draws</p>
                </div>
              </div>
              {h2h.matchesPlayed > 0 && (
                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-3 text-center text-xs">
                  <div>
                    <p className="font-bold text-slate-100">{statsA?.highestScore ?? '-'}</p>
                    <p className="text-[10px] text-slate-400">{teamA} Highest</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-100">{statsB?.highestScore ?? '-'}</p>
                    <p className="text-[10px] text-slate-400">{teamB} Highest</p>
                  </div>
                </div>
              )}
            </div>

            {recentMeetings.length > 0 && (
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-200">Recent Meetings</h3>
                </div>
                {recentMeetings.map(m => {
                  const isTeamAWinner = (m.team_a_name === teamA && m.winner === 'team_a') || (m.team_b_name === teamA && m.winner === 'team_b');
                  return (
                    <Link key={m.id} to={`/matches/${m.id}`} className="block rounded-lg border border-white/10 p-3 hover:border-teal-300 transition-colors hover-lift">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-100 truncate">{m.match_name}</p>
                          <p className="text-xs text-slate-400">{m.match_date}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isTeamAWinner ? 'bg-teal-100 text-teal-300' : 'bg-blue-100 text-sky-300'}`}>
                          {isTeamAWinner ? `${teamA} won` : `${teamB} won`}
                        </span>
                      </div>
                      {m.result_text && <p className="text-[11px] text-slate-400 mt-1">{m.result_text}</p>}
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
