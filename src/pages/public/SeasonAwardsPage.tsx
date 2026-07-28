import { PagePanel } from '../../components/common/PagePanel';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { usePlayers } from '../../hooks/usePlayers';
import { useMemo } from 'react';
import { computeSeasonAwards } from '../../utils/analytics';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { Link } from 'react-router-dom';

export function SeasonAwardsPage() {
  const { data: stats = [] } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map(p => [p.id, p.photo_url])), [players]);

  const awards = useMemo(() => computeSeasonAwards(stats, playerMap), [stats, playerMap]);

  const iconBg: Record<string, string> = {
    'Orange Cap': 'from-orange-400 to-orange-600',
    'Purple Cap': 'from-purple-400 to-purple-600',
    'MVP': 'from-yellow-400 to-yellow-600',
    'Emerging Player': 'from-sky-400 to-sky-600',
    'Best Fielder': 'from-green-400 to-green-600',
  };

  return (
    <div className="space-y-4">
      <PagePanel title="Season Awards">
        {awards.length === 0 ? (
          <p className="text-slate-400 py-8 text-center text-sm">No awards data available yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {awards.map((award) => (
              <div key={award.category} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${iconBg[award.category] ?? 'from-teal-400 to-teal-600'}`}>
                    <span className="text-2xl">{award.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{award.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CircularAvatar src={playerPhotoMap.get(award.playerId)} alt={award.playerName} size="sm" />
                      <Link to={`/players/${award.playerId}`} className="font-bold text-slate-800 hover:text-teal-600 transition-colors truncate">
                        {award.playerName}
                      </Link>
                    </div>
                    <p className="text-sm text-teal-600 font-semibold mt-1">{award.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PagePanel>
    </div>
  );
}
