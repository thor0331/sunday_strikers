import { PagePanel } from '../../components/common/PagePanel';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { GlassCard } from '../../components/common/GlassCard';
import { CareerStats } from '../../components/common/CareerStats';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { usePlayerFormData, usePlayerInningsHistory, usePlayerStreaks, usePotmCount } from '../../hooks/usePlayerDerived';
import { useMemo, useState } from 'react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { Flame, Star, Award, Zap, TrendingUp, Target } from 'lucide-react';

const formConfig = {
  excellent: { label: '🔥 Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  average: { label: '📊 Average', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  needs_improvement: { label: '📉 Needs Work', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-400' },
};

function PlayerCard({ player, stats, potmCounts, avatarViewer }: {
  player: import('../../types/models').Player;
  stats?: import('../../types/models').PlayerStatistics;
  potmCounts: Record<string, number>;
  avatarViewer: { open: (src: string, name: string) => void }
}) {
  const [showDetails, setShowDetails] = useState(false);
  const potmCount = potmCounts[player.id] ?? 0;
  const { achievements, formRating } = usePlayerFormData(stats, potmCount);
  const { data: inningsHistory = [] } = usePlayerInningsHistory(showDetails ? player.id : undefined);
  const { data: streaks = [] } = usePlayerStreaks(showDetails ? player.id : undefined);
  const form = formConfig[formRating];
  const unlockedAchievements = achievements.filter(a => a.unlocked);

  return (
    <GlassCard
      variant="light"
      hover
      className="p-3 sm:p-4"
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="flex items-center gap-3">
        <CircularAvatar
          src={player.photo_url}
          alt={player.display_name}
          size="lg"
          onClick={player.photo_url ? () => avatarViewer.open(player.photo_url!, player.display_name) : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="truncate font-bold text-slate-800 text-base">{player.display_name}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${form.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${form.dot}`} />
              {stats ? form.label : 'No Stats'}
            </span>
            {potmCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {potmCount}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{player.batting_style || 'Batter'} • {player.bowling_style || 'Bowler'}</p>
          {stats && (
            <div className="flex items-center gap-3 mt-1.5">
              <MiniStat label="Runs" value={stats.runs} color="text-teal-600" />
              <MiniStat label="Wkts" value={stats.wickets} color="text-purple-600" />
              <MiniStat label="POTM" value={potmCount} color="text-amber-600" />
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4 animate-slide-down" onClick={e => e.stopPropagation()}>
          {/* Recent Innings */}
          {inningsHistory.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                Last {inningsHistory.length} Innings
              </p>
              <div className="flex gap-2 flex-wrap">
                {inningsHistory.map((inning, i) => (
                  <div key={i} className="flex flex-col items-center animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    <span className={`text-sm font-extrabold px-2.5 py-1 rounded-lg min-w-[2.5rem] text-center ${
                      inning.isOut ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-teal-50 text-teal-600 border border-teal-200'
                    }`}>
                      {inning.runs}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 font-medium">{inning.balls}b</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streaks */}
          {streaks.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-orange-500" />
                Streaks
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {streaks.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 px-3 py-1 text-[11px] font-bold text-orange-700 border border-orange-200 shadow-sm">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    {s.count} {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Career Stats */}
          <CareerStats stats={stats} potmCount={potmCount} matchesPlayed={stats?.matches_played ?? 0} />

          {/* Achievements */}
          {unlockedAchievements.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Award className="w-3 h-3 text-amber-500" />
                Achievements
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {unlockedAchievements.map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-1 text-[11px] font-bold text-amber-700 border border-amber-200 shadow-sm">
                    {a.icon === '50' || a.icon === '100' ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-[9px] font-bold text-white shadow-sm">{a.icon}</span>
                    ) : a.icon === '5w' ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-purple-300 to-purple-500 text-[9px] font-bold text-white shadow-sm">5W</span>
                    ) : a.icon === '🎯' ? (
                      <Target className="w-3.5 h-3.5 text-purple-500" />
                    ) : (
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    {a.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Progression */}
          {achievements.filter(a => !a.unlocked && a.progress).length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-slate-400" />
                In Progress
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {achievements.filter(a => !a.unlocked && a.progress).slice(0, 3).map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 border border-slate-200">
                    <span className="font-medium">{a.title}</span>
                    <span className="text-slate-400">{a.progress!.current}/{a.progress!.target}</span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all"
                        style={{ width: `${(a.progress!.current / a.progress!.target) * 100}%` }}
                      />
                    </div>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="text-xs font-semibold">
      <span className={color}>{value}</span>
      <span className="text-slate-400 ml-0.5">{label}</span>
    </span>
  );
}

export function PlayersPage() {
  const avatarViewer = useAvatarViewerStore();
  const { data: players = [], isLoading, error } = usePlayers();
  const { data: allStats = [] } = usePlayerStatistics();
  const potmCounts = usePotmCount();

  const statsMap = useMemo(() => {
    const map = new Map<string, import('../../types/models').PlayerStatistics>();
    allStats.forEach(s => map.set(s.player_id, s));
    return map;
  }, [allStats]);

  if (error) {
    return (
      <PagePanel title="Players">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3 opacity-60">😔</div>
          <p className="text-base font-bold text-slate-600">Unable to load players</p>
          <p className="text-sm text-slate-400 mt-1">Please try again later.</p>
        </div>
      </PagePanel>
    );
  }

  return (
    <PagePanel title="Players">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500 font-medium animate-pulse">Loading players...</p>
        </div>
      ) : players.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-5xl mb-4 opacity-60">🏏</div>
          <p className="text-base font-bold text-slate-600">No players yet</p>
          <p className="text-sm text-slate-400 mt-1">Players will appear here once added.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 stagger-enter">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} stats={statsMap.get(player.id)} potmCounts={potmCounts} avatarViewer={avatarViewer} />
          ))}
        </div>
      )}
    </PagePanel>
  );
}
