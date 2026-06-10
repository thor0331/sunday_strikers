import { useMemo } from 'react';
import { useParentMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { CircularAvatar } from './CircularAvatar';
import { GlassCard } from './GlassCard';
import { Star, Flame } from 'lucide-react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';

export function PlayerOfTheWeek() {
  const { data: matches = [] } = useParentMatches();
  const { data: players = [] } = usePlayers();
  const { data: allStats = [] } = usePlayerStatistics();
  const avatarViewer = useAvatarViewerStore();

  const potw = useMemo(() => {
    const completed = matches.filter(m => m.status === 'completed').slice(0, 5);
    if (completed.length === 0) return null;

    const score = new Map<string, number>();
    const details = new Map<string, { runs: number; wkts: number; potm: number }>();

    for (const m of completed) {
      if (m.player_of_match_id) {
        score.set(m.player_of_match_id, (score.get(m.player_of_match_id) ?? 0) + 25);
        const d = details.get(m.player_of_match_id) ?? { runs: 0, wkts: 0, potm: 0 };
        d.potm += 1;
        details.set(m.player_of_match_id, d);
      }
    }

    for (const s of allStats) {
      const d = details.get(s.player_id) ?? { runs: 0, wkts: 0, potm: 0 };
      d.runs = s.runs;
      d.wkts = s.wickets;
      details.set(s.player_id, d);
      score.set(s.player_id, (score.get(s.player_id) ?? 0) + s.runs + s.wickets * 15);
    }

    let topId = '';
    let topScore = 0;
    for (const [id, s] of score) {
      if (s > topScore) { topScore = s; topId = id; }
    }

    if (!topId) return null;
    const player = players.find(p => p.id === topId);
    const det = details.get(topId);
    return player ? { player, runs: det?.runs ?? 0, wkts: det?.wkts ?? 0, potm: det?.potm ?? 0 } : null;
  }, [matches, allStats, players]);

  if (!potw) return null;

  return (
    <GlassCard variant="light" hover className="p-4 overflow-hidden relative">
      <div className="absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br from-amber-200/30 to-amber-400/10 rounded-full blur-2xl" />
      <div className="flex items-center gap-2 mb-3 relative">
        <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-600">
          <Flame className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Player of the Week</span>
      </div>
      <div className="flex items-center gap-3 relative">
        <CircularAvatar
          src={potw.player.photo_url}
          alt={potw.player.display_name}
          size="lg"
          onClick={potw.player.photo_url ? () => avatarViewer.open(potw.player.photo_url!, potw.player.display_name) : undefined}
        />
        <div className="min-w-0">
          <p className="font-bold text-slate-800 truncate text-base">{potw.player.display_name}</p>
          <div className="flex gap-3 mt-1.5">
            <StatBadge label="Runs" value={potw.runs} color="emerald" />
            <StatBadge label="Wkts" value={potw.wkts} color="blue" />
            <StatBadge label="POTM" value={potw.potm} color="amber" highlight />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function StatBadge({ label, value, color, highlight }: { label: string; value: number; color: string; highlight?: boolean }) {
  const colors: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
  };
  const c = colors[color] ?? colors.emerald;

  return (
    <span className={`${c.bg} ${c.text} text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${highlight ? 'animate-bounce-gentle' : ''}`}>
      {highlight && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
      {value} {label}
    </span>
  );
}
