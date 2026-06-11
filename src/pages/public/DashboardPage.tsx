import { PagePanel } from '../../components/common/PagePanel';
import { useParentMatches } from '../../hooks/useMatches';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { usePlayers } from '../../hooks/usePlayers';
import { LiveMatchBanner } from '../../components/common/LiveMatchCard';
import { UpcomingMatchWidget } from '../../components/common/UpcomingMatchWidget';
import { PlayerOfTheWeek } from '../../components/common/PlayerOfTheWeek';
import { OrangeCapWidget, PurpleCapWidget } from '../../components/common/CapWidgets';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Trophy, Calendar, TrendingUp, Zap } from 'lucide-react';

function MatchStatusBanner({ matches }: { matches: import('../../types/models').Match[] }) {
  const liveMatch = matches.find(m => m.status === 'in_progress');
  const tossMatch = matches.find(m => m.status === 'toss_completed' && !matches.find(m2 => m2.status === 'in_progress'));
  
  if (liveMatch) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-red-700">🔴 Live Now</span>
        </div>
        <LiveMatchBanner matchId={liveMatch.id} />
      </div>
    );
  }
  
  if (tossMatch) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Toss Completed</span>
        </div>
        <div className="glass rounded-2xl p-5 border border-amber-200/50">
          <p className="font-bold text-slate-800 text-lg truncate">{tossMatch.match_name}</p>
          <p className="text-sm text-slate-500">{tossMatch.match_date} • {tossMatch.venue || 'No venue'}</p>
          <p className="text-sm text-amber-600 font-semibold mt-2">{tossMatch.team_a_name} vs {tossMatch.team_b_name}</p>
          <p className="text-xs text-slate-400 mt-1">Scoring will begin shortly</p>
        </div>
      </div>
    );
  }
  
  return null;
}

export function DashboardPage() {
  const { data: matches = [], isLoading } = useParentMatches();
  const { data: stats = [] } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map(p => [p.id, p.photo_url])), [players]);

  const upcoming = useMemo(() =>
    matches.filter((m) => ['draft', 'scheduled', 'teams_created'].includes(m.status)).slice(0, 3),
    [matches]
  );
  const completed = useMemo(() =>
    matches.filter((m) => m.status === 'completed').slice(0, 3),
    [matches]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-slate-500 font-medium animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Match Status Banner - Live, Toss, or None */}
      <MatchStatusBanner matches={matches} />

      {/* Player of the Week */}
      <PlayerOfTheWeek />

      {/* Orange Cap & Purple Cap */}
      <div className="grid gap-3 sm:grid-cols-2 stagger-enter">
        <OrangeCapWidget stats={stats} playerMap={playerMap} playerPhotoMap={playerPhotoMap} />
        <PurpleCapWidget stats={stats} playerMap={playerMap} playerPhotoMap={playerPhotoMap} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Upcoming Matches */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Upcoming</h2>
            </div>
            {upcoming.length >= 3 && (
              <Link to="/matches" className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          {upcoming.length === 0 ? (
            <GlassCard variant="light" className="p-6">
              <EmptyState icon="🏏" title="No upcoming matches" description="New matches will appear here when scheduled." />
            </GlassCard>
          ) : (
            <div className="grid gap-3 stagger-enter">
              {upcoming.map((match) => (
                <UpcomingMatchWidget key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">Recent Results</h2>
            </div>
            {completed.length >= 3 && (
              <Link to="/matches" className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          {completed.length === 0 ? (
            <GlassCard variant="light" className="p-6">
              <EmptyState icon="📊" title="No completed matches" description="Match results will appear here after games finish." />
            </GlassCard>
          ) : (
            <div className="grid gap-2 stagger-enter">
              {completed.map((match) => (
                <Link key={match.id} to={`/matches/${match.id}`} className="block group">
                  <GlassCard variant="light" hover className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-400">{match.match_date}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Completed
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 truncate group-hover:text-teal-600 transition-colors">{match.match_name}</p>
                    <p className="text-sm text-teal-600 font-medium mt-1">{match.result_text || 'Result recorded'}</p>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
