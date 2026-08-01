import { useMemo } from 'react';
import { CircularAvatar } from './CircularAvatar';
import { GlassCard } from './GlassCard';
import { Target, Star } from 'lucide-react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';

export interface CapStatRow {
  player_id: string;
  runs: number;
  wickets: number;
}

interface CapWidgetsProps {
  stats: CapStatRow[];
  playerMap: Map<string, string>;
  playerPhotoMap: Map<string, string | null>;
}

export function OrangeCapWidget({ stats, playerMap, playerPhotoMap }: CapWidgetsProps) {
  const avatarViewer = useAvatarViewerStore();
  const top = useMemo(() => {
    if (stats.length === 0) return null;
    const s = [...stats].sort((a, b) => b.runs - a.runs)[0];
    return {
      playerName: playerMap.get(s.player_id) ?? 'Unknown',
      value: s.runs,
      photo: playerPhotoMap.get(s.player_id) ?? null,
      playerId: s.player_id,
    };
  }, [stats, playerMap, playerPhotoMap]);

  if (!top) return null;

  return (
    <GlassCard variant="light" hover className="p-4 overflow-hidden relative">
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-orange-400/20 to-orange-400/10 rounded-full blur-xl" />
      <div className="flex items-center gap-3 relative">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Orange Cap</p>
          <div className="flex items-center gap-2 mt-1">
            <CircularAvatar
              src={top.photo}
              alt={top.playerName}
              size="sm"
              onClick={top.photo ? () => avatarViewer.open(top.photo!, top.playerName) : undefined}
            />
            <span className="text-sm font-bold text-slate-50 truncate">{top.playerName}</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-orange-400 tabular-nums">{top.value}</span>
            <span className="text-[10px] text-orange-400/90 font-semibold uppercase tracking-wider">Runs</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export function PurpleCapWidget({ stats, playerMap, playerPhotoMap }: CapWidgetsProps) {
  const avatarViewer = useAvatarViewerStore();
  const top = useMemo(() => {
    if (stats.length === 0) return null;
    const s = [...stats].sort((a, b) => b.wickets - a.wickets)[0];
    return {
      playerName: playerMap.get(s.player_id) ?? 'Unknown',
      value: s.wickets,
      photo: playerPhotoMap.get(s.player_id) ?? null,
      playerId: s.player_id,
    };
  }, [stats, playerMap, playerPhotoMap]);

  if (!top) return null;

  return (
    <GlassCard variant="light" hover className="p-4 overflow-hidden relative">
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-purple-400/10 rounded-full blur-xl" />
      <div className="flex items-center gap-3 relative">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg shadow-purple-500/30">
          <Star className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Purple Cap</p>
          <div className="flex items-center gap-2 mt-1">
            <CircularAvatar
              src={top.photo}
              alt={top.playerName}
              size="sm"
              onClick={top.photo ? () => avatarViewer.open(top.photo!, top.playerName) : undefined}
            />
            <span className="text-sm font-bold text-slate-50 truncate">{top.playerName}</span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-purple-400 tabular-nums">{top.value}</span>
            <span className="text-[10px] text-purple-400/90 font-semibold uppercase tracking-wider">Wickets</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
