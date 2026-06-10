import { PagePanel } from '../../components/common/PagePanel';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useParentMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useMemo } from 'react';
import { computeHallOfFame } from '../../utils/analytics';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { GlassCard } from '../../components/common/GlassCard';
import { Link } from 'react-router-dom';

export function HallOfFamePage() {
  const { data: matches = [] } = useParentMatches();
  const { data: stats = [] } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map(p => [p.id, p.photo_url])), [players]);

  const hall = useMemo(() => computeHallOfFame(stats, matches, playerMap), [stats, matches, playerMap]);

  const records = [
    { icon: '🏏', label: 'Most Runs', value: hall.mostRuns?.value, name: hall.mostRuns?.playerName, playerId: hall.mostRuns ? getPlayerId(stats, hall.mostRuns.value, 'runs') : null, bg: 'from-emerald-400 to-emerald-600' },
    { icon: '🎯', label: 'Most Wickets', value: hall.mostWickets?.value, name: hall.mostWickets?.playerName, playerId: hall.mostWickets ? getPlayerId(stats, hall.mostWickets.value, 'wickets') : null, bg: 'from-purple-400 to-purple-600' },
    { icon: '🏆', label: 'Most POTM Awards', value: hall.mostPotm?.value, name: hall.mostPotm?.playerName, playerId: null, bg: 'from-amber-400 to-amber-600' },
    { icon: '🔥', label: 'Highest Individual Score', value: hall.highestScore?.value, name: hall.highestScore?.playerName, playerId: hall.highestScore ? getPlayerId(stats, hall.highestScore.value, 'highest_score') : null, bg: 'from-red-400 to-red-600' },
  ];

  return (
    <div className="space-y-4">
      <PagePanel title="Hall of Fame">
        <p className="text-xs text-slate-500 -mt-2 mb-4">All-time records and achievements</p>
        <div className="grid gap-4 sm:grid-cols-2 stagger-enter">
          {records.map((record, i) => {
            const photoUrl = record.playerId ? playerPhotoMap.get(record.playerId) : null;
            const playerName = record.name;
            return (
              <GlassCard key={i} variant="light" hover className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${record.bg} shadow-lg`}>
                    <span className="text-2xl">{record.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{record.label}</p>
                    <p className="text-2xl font-extrabold text-slate-800 mt-0.5 tabular-nums">{record.value ?? '-'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <CircularAvatar src={photoUrl} alt={playerName ?? ''} size="sm" />
                      <Link to="/players" className="text-sm font-semibold text-slate-600 hover:text-teal-600 transition-colors truncate">
                        {playerName ?? 'Unknown'}
                      </Link>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </PagePanel>
    </div>
  );
}

function getPlayerId(stats: { player_id: string; runs: number; wickets: number; highest_score: number }[], value: number, field: 'runs' | 'wickets' | 'highest_score') {
  return stats.find(s => s[field] === value)?.player_id ?? null;
}
