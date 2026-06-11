import { PagePanel } from '../../components/common/PagePanel';
import { useMatch, useInnings, useMatchPlayers, useParentMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Zap, ChevronRight, Play, CheckCircle, Clock, Target } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { MomentumGraph } from '../../components/common/MomentumGraph';
import { MatchHeroes } from '../../components/common/MatchHeroes';

function MatchCard({ matchId }: { matchId: string }) {
  const { data: match } = useMatch(matchId);
  const { data: inningsList = [] } = useInnings(matchId);
  const { data: matchPlayers = [] } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();
  const { data: ballEvents1 = [] } = useBallEvents(inningsList.find(i => i.innings_number === 1)?.id ?? null);
  const { data: ballEvents2 = [] } = useBallEvents(inningsList.find(i => i.innings_number === 2)?.id ?? null);

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map(p => [p.id, p.photo_url])), [players]);

  const innings1Stats = useMemo(() => {
    const innings1 = inningsList.find(i => i.innings_number === 1);
    if (!innings1 || !match) return null;
    const batting = matchPlayers.filter(mp => mp.team === innings1.batting_team);
    const battingOrder = batting.map(mp => mp.player_id);
    const striker = battingOrder[0];
    const nonStriker = battingOrder[1];
    if (!striker || !nonStriker) return null;
    const ctx: ScoringContext = {
      inningsId: innings1.id, openingStrikerId: striker, openingNonStrikerId: nonStriker,
      battingOrder, oversPerInnings: match.overs_per_innings,
      playersPerTeam: match.players_per_team, targetRuns: null,
    };
    try { return calculateInningsState(ctx, ballEvents1); } catch { return null; }
  }, [inningsList, match, matchPlayers, ballEvents1]);

  const innings2Stats = useMemo(() => {
    const innings2 = inningsList.find(i => i.innings_number === 2);
    if (!innings2 || !match) return null;
    const batting = matchPlayers.filter(mp => mp.team === innings2.batting_team);
    const battingOrder = batting.map(mp => mp.player_id);
    const striker = battingOrder[0];
    const nonStriker = battingOrder[1];
    if (!striker || !nonStriker) return null;
    const ctx: ScoringContext = {
      inningsId: innings2.id, openingStrikerId: striker, openingNonStrikerId: nonStriker,
      battingOrder, oversPerInnings: match.overs_per_innings,
      playersPerTeam: match.players_per_team, targetRuns: innings2.target_runs,
    };
    try { return calculateInningsState(ctx, ballEvents2); } catch { return null; }
  }, [inningsList, match, matchPlayers, ballEvents2]);

  if (!match) return null;

  const isLive = match.status === 'in_progress';
  const isCompleted = match.status === 'completed';

  return (
    <Link to={`/matches/${match.id}`} className="block group">
      <GlassCard variant="light" hover className={`p-4 ${isLive ? 'border-l-4 border-l-red-500 live-ring' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-400">{match.match_date}</span>
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-600 border border-red-200 animate-live-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              🔴 LIVE
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Completed
            </span>
          )}
          {!isLive && !isCompleted && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase">{match.status.replace('_', ' ')}</span>
          )}
        </div>
        <p className="font-bold text-slate-800 truncate text-base group-hover:text-teal-600 transition-colors">{match.match_name}</p>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 min-w-0">
          <span className="font-medium truncate min-w-0">{match.team_a_name}</span>
          <span className="font-bold text-slate-300 shrink-0">vs</span>
          <span className="font-medium truncate min-w-0">{match.team_b_name}</span>
        </div>
        {match.result_text && isCompleted && (
          <p className="text-xs text-teal-600 font-semibold mt-1.5">{match.result_text}</p>
        )}
        {match.venue && (
          <p className="text-xs text-slate-400 mt-1.5 inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{match.venue}</p>
        )}

        {/* Match Heroes for completed matches */}
        {isCompleted && match.player_of_match_id && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <MatchHeroes
              match={match}
              innings1Stats={innings1Stats}
              innings2Stats={innings2Stats}
              playerMap={playerMap}
              playerPhotoMap={playerPhotoMap}
            />
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
            className={`shrink-0 rounded-full px-4 py-3 text-xs font-bold transition-all duration-200 btn-press min-h-[44px] ${
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
