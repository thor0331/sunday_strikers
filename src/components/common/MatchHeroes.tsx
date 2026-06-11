import type { DerivedInningsState, Match } from '../../types/models';
import { useMemo } from 'react';
import { CircularAvatar } from './CircularAvatar';
import { GlassCard } from './GlassCard';
import { Award, Flame, Sparkles, Target } from 'lucide-react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';

interface MatchHeroesProps {
  match: Match;
  innings1Stats: DerivedInningsState | null;
  innings2Stats: DerivedInningsState | null;
  playerMap: Map<string, string>;
  playerPhotoMap: Map<string, string | null>;
}

export function MatchHeroes({ match, innings1Stats, innings2Stats, playerMap, playerPhotoMap }: MatchHeroesProps) {
  const avatarViewer = useAvatarViewerStore();

  const heroes = useMemo(() => {
    const allBatting = [
      ...Object.values(innings1Stats?.battingStats ?? {}),
      ...Object.values(innings2Stats?.battingStats ?? {}),
    ];
    const allBowling = [
      ...Object.values(innings1Stats?.bowlingStats ?? {}),
      ...Object.values(innings2Stats?.bowlingStats ?? {}),
    ];

    const topScorer = allBatting.reduce((max, b) => (b.runs > (max?.runs ?? 0) ? b : max), allBatting[0]);
    const bestBowler = allBowling.reduce((max, b) => (b.wickets > (max?.wickets ?? 0) ? b : max), allBowling[0]);

    const scores = new Map<string, number>();
    for (const b of allBatting) {
      scores.set(b.playerId, (scores.get(b.playerId) ?? 0) + b.runs);
    }
    for (const b of allBowling) {
      scores.set(b.playerId, (scores.get(b.playerId) ?? 0) + b.wickets * 20);
    }
    let maxScore = 0;
    let impactId = '';
    for (const [id, score] of scores) {
      if (score > maxScore) { maxScore = score; impactId = id; }
    }

    return { topScorer, bestBowler, impactPlayerId: impactId };
  }, [innings1Stats, innings2Stats]);

  const potmName = match.player_of_match_id ? playerMap.get(match.player_of_match_id) : null;
  const potmId = match.player_of_match_id;
  const potmPhoto = potmId ? playerPhotoMap.get(potmId) : null;

  const topScorerPhoto = heroes.topScorer ? playerPhotoMap.get(heroes.topScorer.playerId) : null;
  const bestBowlerPhoto = heroes.bestBowler ? playerPhotoMap.get(heroes.bestBowler.playerId) : null;
  const impactPhoto = heroes.impactPlayerId ? playerPhotoMap.get(heroes.impactPlayerId) : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <HeroCard
        icon={<Target className="w-5 h-5" />}
        iconBg="bg-emerald-100 text-emerald-600"
        label="Top Scorer"
        playerName={heroes.topScorer ? playerMap.get(heroes.topScorer.playerId) ?? '-' : '-'}
        stat={heroes.topScorer ? `${heroes.topScorer.runs} runs (${heroes.topScorer.balls}b)` : '-'}
        photoUrl={topScorerPhoto}
        onPhotoClick={topScorerPhoto && heroes.topScorer ? () => avatarViewer.open(topScorerPhoto!, playerMap.get(heroes.topScorer!.playerId) ?? '') : undefined}
      />
      <HeroCard
        icon={<Sparkles className="w-5 h-5" />}
        iconBg="bg-blue-100 text-blue-600"
        label="Best Bowler"
        playerName={heroes.bestBowler ? playerMap.get(heroes.bestBowler.playerId) ?? '-' : '-'}
        stat={heroes.bestBowler ? `${heroes.bestBowler.wickets} wkts (${heroes.bestBowler.oversDisplay} ov)` : '-'}
        photoUrl={bestBowlerPhoto}
        onPhotoClick={bestBowlerPhoto && heroes.bestBowler ? () => avatarViewer.open(bestBowlerPhoto!, playerMap.get(heroes.bestBowler!.playerId) ?? '') : undefined}
      />
      <HeroCard
        icon={<Award className="w-5 h-5" />}
        iconBg="bg-amber-100 text-amber-600"
        label="Player of the Match"
        playerName={potmName ?? '-'}
        stat={match.result_text ?? ''}
        photoUrl={potmPhoto}
        onPhotoClick={potmPhoto && potmId ? () => avatarViewer.open(potmPhoto!, potmName ?? '') : undefined}
      />
      <HeroCard
        icon={<Flame className="w-5 h-5" />}
        iconBg="bg-rose-100 text-rose-600"
        label="Match Impact"
        playerName={heroes.impactPlayerId ? playerMap.get(heroes.impactPlayerId) ?? '-' : '-'}
        stat="All-round performance"
        photoUrl={impactPhoto}
        onPhotoClick={impactPhoto && heroes.impactPlayerId ? () => avatarViewer.open(impactPhoto!, playerMap.get(heroes.impactPlayerId!) ?? '') : undefined}
      />
    </div>
  );
}

function HeroCard({ icon, iconBg, label, playerName, stat, photoUrl, onPhotoClick }: { icon: React.ReactNode; iconBg: string; label: string; playerName: string; stat: string; photoUrl?: string | null; onPhotoClick?: () => void }) {
  return (
    <GlassCard variant="light" hover className="p-3 sm:p-4 text-center">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${iconBg} mb-2 shadow-sm`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <div className="flex justify-center mb-1.5">
        <CircularAvatar src={photoUrl} alt={playerName} size="sm" onClick={onPhotoClick} />
      </div>
      <p className="text-sm font-bold text-slate-800 truncate">{playerName}</p>
      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{stat}</p>
    </GlassCard>
  );
}
