import { PagePanel } from '../../components/common/PagePanel';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { GlassCard } from '../../components/common/GlassCard';
import { CareerStats } from '../../components/common/CareerStats';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { usePlayerFormData, usePlayerInningsHistory, usePlayerStreaks, usePotmCount } from '../../hooks/usePlayerDerived';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { SkeletonCard } from '../../components/common/Skeleton';
import { Flame, Star, Award, Zap, TrendingUp, Target } from 'lucide-react';

const formConfig = {
  excellent: { label: '🔥 Excellent', color: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25', dot: 'bg-emerald-400' },
  average: { label: '📊 Average', color: 'bg-amber-400/10 text-amber-300 border-amber-400/25', dot: 'bg-amber-400' },
  needs_improvement: { label: '📉 Needs Work', color: 'bg-red-400/10 text-red-300 border-red-400/25', dot: 'bg-red-400' },
};

function PlayerCard({ player, stats, potmCounts, avatarViewer, onNavigate }: {
  player: import('../../types/models').Player;
  stats?: import('../../types/models').PlayerStatistics;
  potmCounts: Record<string, number>;
  avatarViewer: { open: (src: string, name: string) => void };
  onNavigate: (playerId: string) => void;
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
            <h3 className="truncate font-bold text-slate-100 text-base">{player.display_name}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${form.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${form.dot}`} />
              {stats ? form.label : 'No Stats'}
            </span>
            {potmCount > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/25">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {potmCount}
              </span>
            )}
          </div>
          {player.batting_style || player.bowling_style ? (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {player.batting_style && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300 border border-teal-400/25">
                  🏏 {player.batting_style}
                </span>
              )}
              {player.bowling_style && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-300 border border-red-400/25">
                  🎯 {player.bowling_style}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">Batter • Bowler</p>
          )}
          {stats && (
            <div className="flex items-center gap-3 mt-1.5">
              <MiniStat label="Runs" value={stats.runs} color="text-teal-300" />
              <MiniStat label="Wkts" value={stats.wickets} color="text-purple-300" />
              <MiniStat label="POTM" value={potmCount} color="text-amber-300" />
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t border-white/10 space-y-4 animate-slide-down" onClick={e => e.stopPropagation()}>
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
                      inning.isOut ? 'bg-red-400/10 text-red-300 border border-red-400/25' : 'bg-teal-400/10 text-teal-300 border border-teal-400/25'
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
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-400/10 to-amber-400/10 px-3 py-1 text-[11px] font-bold text-orange-300 border border-orange-400/25 shadow-sm">
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
                  <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400/10 to-yellow-400/10 px-3 py-1 text-[11px] font-bold text-amber-300 border border-amber-400/25 shadow-sm">
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
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 text-[11px] text-slate-300 border border-white/10">
                    <span className="font-medium">{a.title}</span>
                    <span className="text-slate-400">{a.progress!.current}/{a.progress!.target}</span>
                    <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
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
  const navigate = useNavigate();
  const avatarViewer = useAvatarViewerStore();
  const { data: players = [], isLoading, error } = usePlayers();
  const { data: allStats = [] } = usePlayerStatistics();
  const potmCounts = usePotmCount();

  const statsMap = useMemo(() => {
    const map = new Map<string, import('../../types/models').PlayerStatistics>();
    for (const s of allStats) {
      const existing = map.get(s.player_id);
      if (!existing) {
        map.set(s.player_id, { ...s });
        continue;
      }
      existing.matches_played += s.matches_played;
      existing.batting_innings += s.batting_innings;
      existing.runs += s.runs;
      existing.balls_faced += s.balls_faced;
      existing.fours += s.fours;
      existing.sixes += s.sixes;
      existing.outs += s.outs;
      existing.highest_score = Math.max(existing.highest_score, s.highest_score);
      existing.bowling_innings += s.bowling_innings;
      existing.balls_bowled += s.balls_bowled;
      existing.runs_conceded += s.runs_conceded;
      existing.wickets += s.wickets;
      existing.maidens += s.maidens;
      existing.catches += s.catches;
      existing.run_outs += s.run_outs;
      existing.stumpings += s.stumpings;
    }
    return map;
  }, [allStats]);

  if (error) {
    return (
      <PagePanel title="Players">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3 opacity-60">😔</div>
          <p className="text-base font-bold text-white/70">Unable to load players</p>
          <p className="text-sm text-slate-400 mt-1">Please try again later.</p>
        </div>
      </PagePanel>
    );
  }

  return (
    <PagePanel title="Players">
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 stagger-enter">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-5xl mb-4 opacity-60">🏏</div>
          <p className="text-base font-bold text-white/70">No players yet</p>
          <p className="text-sm text-slate-400 mt-1">Players will appear here once added.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 stagger-enter">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} stats={statsMap.get(player.id)} potmCounts={potmCounts} avatarViewer={avatarViewer} onNavigate={(id) => navigate(`/players/${id}`)} />
          ))}
        </div>
      )}
    </PagePanel>
  );
}
