import { PagePanel } from '../../components/common/PagePanel';
import { useMatch, useInnings, useMatchPlayers, useParentMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Zap, ChevronRight, Play, CheckCircle, Clock } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { MomentumGraph } from '../../components/common/MomentumGraph';

function MatchCard({ matchId }: { matchId: string }) {
  const { data: match } = useMatch(matchId);
  const { data: inningsList = [] } = useInnings(matchId);
  const { data: ballEvents1 = [] } = useBallEvents(inningsList.find(i => i.innings_number === 1)?.id ?? null);
  const { data: ballEvents2 = [] } = useBallEvents(inningsList.find(i => i.innings_number === 2)?.id ?? null);

  if (!match) return null;

  const isLive = match.status === 'in_progress';
  const isCompleted = match.status === 'completed';

  return (
    <Link to={`/matches/${match.id}`} className="block">
      <GlassCard variant="light" hover className={`p-4 ${isLive ? 'border-l-4 border-l-red-500' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400">{match.match_date}</span>
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-200 animate-live-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
          {isCompleted && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
          {!isLive && !isCompleted && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase">{match.status.replace('_', ' ')}</span>
          )}
        </div>
        <p className="font-bold text-slate-800 truncate text-base">{match.match_name}</p>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
          <span className="font-medium">{match.team_a_name}</span>
          <span className="font-bold text-slate-300">vs</span>
          <span className="font-medium">{match.team_b_name}</span>
        </div>
        {match.venue && (
          <p className="text-xs text-slate-400 mt-1.5 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{match.venue}</p>
        )}

        {/* Mini Momentum Graph for completed/live matches with data */}
        {isCompleted && (ballEvents1.length > 0 || ballEvents2.length > 0) && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex gap-3">
              {ballEvents1.length > 0 && (
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
                    {match.team_a_name}
                  </p>
                  <div className="flex items-end gap-0.5 h-8">
                    {Array.from({ length: Math.min(6, inningsList.find(i => i.innings_number === 1) ? 6 : 1) }, (_, i) => {
                      const overs = new Map<number, number>();
                      for (const event of ballEvents1) {
                        overs.set(event.overNumber, (overs.get(event.overNumber) ?? 0) + event.runsBatter + event.runsExtra);
                      }
                      const runs = overs.get(i) ?? 0;
                      const maxRuns = Math.max(...Array.from(overs.values()), 1);
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm transition-all"
                          style={{
                            height: `${(runs / maxRuns) * 100}%`,
                            backgroundColor: runs >= 6 ? '#059669' : runs >= 4 ? '#0d9488' : runs > 0 ? '#94a3b8' : '#e2e8f0',
                            minHeight: '2px'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {ballEvents2.length > 0 && (
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wider">
                    {match.team_b_name}
                  </p>
                  <div className="flex items-end gap-0.5 h-8">
                    {Array.from({ length: Math.min(6, inningsList.find(i => i.innings_number === 2) ? 6 : 1) }, (_, i) => {
                      const overs = new Map<number, number>();
                      for (const event of ballEvents2) {
                        overs.set(event.overNumber, (overs.get(event.overNumber) ?? 0) + event.runsBatter + event.runsExtra);
                      }
                      const runs = overs.get(i) ?? 0;
                      const maxRuns = Math.max(...Array.from(overs.values()), 1);
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm transition-all"
                          style={{
                            height: `${(runs / maxRuns) * 100}%`,
                            backgroundColor: runs >= 6 ? '#059669' : runs >= 4 ? '#0d9488' : runs > 0 ? '#94a3b8' : '#e2e8f0',
                            minHeight: '2px'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </Link>
  );
}

export function MatchCenterPage() {
  const { data: matches = [] } = useParentMatches();
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');

  const filtered = useMemo(() => {
    if (statusFilter === 'live') return matches.filter(m => m.status === 'in_progress');
    if (statusFilter === 'upcoming') return matches.filter(m => ['draft', 'scheduled', 'teams_created', 'toss_completed'].includes(m.status));
    if (statusFilter === 'completed') return matches.filter(m => m.status === 'completed');
    return matches;
  }, [matches, statusFilter]);

  const liveMatches = matches.filter(m => m.status === 'in_progress');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Live Now Banner */}
      {liveMatches.length > 0 && (
        <GlassCard variant="strong" glow="red" className="p-4 border-2 border-red-200/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">Live Now</span>
          </div>
          <div className="grid gap-3 stagger-enter">
            {liveMatches.map(m => <MatchCard key={m.id} matchId={m.id} />)}
          </div>
        </GlassCard>
      )}

      {/* Animated Filters */}
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
        {(['all', 'live', 'upcoming', 'completed'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 btn-press ${
              statusFilter === filter
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md'
                : 'glass text-slate-600 hover:bg-white/90'
            }`}
          >
            {filter === 'all' ? 'All' : filter === 'live' ? '🔴 Live' : filter === 'upcoming' ? '📅 Upcoming' : '✅ Completed'}
          </button>
        ))}
      </div>

      {/* Match List */}
      <div className="space-y-2 stagger-enter">
        {filtered.length === 0 ? (
          <GlassCard variant="light" className="p-6">
            <EmptyState
              icon={statusFilter === 'live' ? '🔴' : statusFilter === 'completed' ? '🏏' : '📅'}
              title={statusFilter === 'live' ? 'No live matches' : statusFilter === 'completed' ? 'No completed matches' : 'No upcoming matches'}
              description="Matches will appear here when available."
            />
          </GlassCard>
        ) : (
          filtered.map(m => <MatchCard key={m.id} matchId={m.id} />)
        )}
      </div>
    </div>
  );
}
