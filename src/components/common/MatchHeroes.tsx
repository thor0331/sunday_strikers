import type { BallEvent, DerivedInningsState, Match } from '../../types/models';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CircularAvatar } from './CircularAvatar';
import { GlassCard } from './GlassCard';
import { Award, Flame, Sparkles, Target, Gauge } from 'lucide-react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { computeMatchImpactScore, type ImpactCandidate } from '../../utils/matchAnalytics';

interface MatchHeroesProps {
  match: Match;
  innings1Stats: DerivedInningsState | null;
  innings2Stats: DerivedInningsState | null;
  playerMap: Map<string, string>;
  playerPhotoMap: Map<string, string | null>;
  ballEvents1?: BallEvent[];
  ballEvents2?: BallEvent[];
  impactCandidates?: ImpactCandidate[];
}

export function MatchHeroes({ match, innings1Stats, innings2Stats, playerMap, playerPhotoMap, ballEvents1 = [], ballEvents2 = [], impactCandidates }: MatchHeroesProps) {
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
    const maxRuns = allBatting.reduce((m, b) => Math.max(m, b.runs), 0);
    const maxWickets = allBowling.reduce((m, b) => Math.max(m, b.wickets), 0);

    const candidates = impactCandidates ?? computeMatchImpactScore({
      match,
      innings1Stats,
      innings2Stats,
      ballEvents1,
      ballEvents2,
      playerMap
    });

    return { topScorer, bestBowler, impactCandidates: candidates, maxRuns, maxWickets };
  }, [match, innings1Stats, innings2Stats, ballEvents1, ballEvents2, playerMap, impactCandidates]);

  const impact = heroes.impactCandidates[0];
  const potmName = match.player_of_match_id ? playerMap.get(match.player_of_match_id) : null;
  const potmId = match.player_of_match_id;
  const potmPhoto = potmId ? playerPhotoMap.get(potmId) : null;

  const topScorerPhoto = heroes.topScorer ? playerPhotoMap.get(heroes.topScorer.playerId) : null;
  const bestBowlerPhoto = heroes.bestBowler ? playerPhotoMap.get(heroes.bestBowler.playerId) : null;
  const impactPhoto = impact ? playerPhotoMap.get(impact.playerId) : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <HeroCard
        icon={<Target className="w-5 h-5" />}
        iconBg="bg-emerald-400/10 text-emerald-300 border-emerald-400/25"
        glow="glow-green"
        label="Top Scorer"
        playerName={heroes.topScorer ? playerMap.get(heroes.topScorer.playerId) ?? '-' : '-'}
        stat={heroes.topScorer ? `${heroes.topScorer.runs} runs (${heroes.topScorer.balls}b)` : '-'}
        barPct={heroes.maxRuns > 0 && heroes.topScorer ? (heroes.topScorer.runs / heroes.maxRuns) * 100 : 0}
        barGradient="from-emerald-500 to-teal-400"
        photoUrl={topScorerPhoto}
        onPhotoClick={topScorerPhoto && heroes.topScorer ? () => avatarViewer.open(topScorerPhoto!, playerMap.get(heroes.topScorer!.playerId) ?? '') : undefined}
      />
      <HeroCard
        icon={<Sparkles className="w-5 h-5" />}
        iconBg="bg-sky-400/10 text-sky-300 border-sky-400/25"
        glow="glow-blue"
        label="Best Bowler"
        playerName={heroes.bestBowler ? playerMap.get(heroes.bestBowler.playerId) ?? '-' : '-'}
        stat={heroes.bestBowler ? `${heroes.bestBowler.wickets} wkts (${heroes.bestBowler.oversDisplay} ov)` : '-'}
        barPct={heroes.maxWickets > 0 && heroes.bestBowler ? (heroes.bestBowler.wickets / heroes.maxWickets) * 100 : 0}
        barGradient="from-sky-500 to-cyan-400"
        photoUrl={bestBowlerPhoto}
        onPhotoClick={bestBowlerPhoto && heroes.bestBowler ? () => avatarViewer.open(bestBowlerPhoto!, playerMap.get(heroes.bestBowler!.playerId) ?? '') : undefined}
      />
      <HeroCard
        icon={<Award className="w-5 h-5" />}
        iconBg="bg-amber-400/10 text-amber-300 border-amber-400/25"
        glow="glow-yellow"
        label="Player of the Match"
        playerName={potmName ?? '-'}
        stat={match.result_text ?? ''}
        photoUrl={potmPhoto}
        onPhotoClick={potmPhoto && potmId ? () => avatarViewer.open(potmPhoto!, potmName ?? '') : undefined}
      />
      <GlassCard variant="light" hover className="p-4 text-center relative overflow-hidden glow-red">
        <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-gradient-to-br from-rose-400/25 to-rose-600/10" />
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-rose-400/10 text-rose-300 border border-rose-400/25 mb-2 shadow-sm">
          <Flame className="w-5 h-5" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Match Impact</p>
        <div className="relative inline-flex justify-center mb-1.5">
          <span className="animate-ring-pulse absolute inset-0 rounded-full border-2 border-rose-400/50" />
          <span className="animate-ring-pulse absolute inset-0 rounded-full border border-rose-300/40" style={{ animationDelay: '1.1s' }} />
          <CircularAvatar src={impactPhoto} alt={impact?.name ?? '-'} size="md" onClick={impactPhoto && impact ? () => avatarViewer.open(impactPhoto!, impact!.name) : undefined} />
        </div>
        <p className="text-base font-bold text-slate-50 truncate">{impact?.name ?? '-'}</p>
        {impact ? (
          <div className="mt-1.5 flex items-center justify-center gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-400/10 border border-rose-400/25 rounded-full px-2.5 py-0.5 tabular-nums">
              <Gauge className="w-3.5 h-3.5" />
              {impact.total} pts
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-300 mt-1 font-medium">All-round performance</p>
        )}
        <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">{impact?.reason}</p>
      </GlassCard>
    </div>
  );
}

function HeroCard({ icon, iconBg, glow, label, playerName, stat, barPct, barGradient, photoUrl, onPhotoClick }: {
  icon: React.ReactNode;
  iconBg: string;
  glow: string;
  label: string;
  playerName: string;
  stat: string;
  barPct?: number;
  barGradient?: string;
  photoUrl?: string | null;
  onPhotoClick?: () => void;
}) {
  return (
    <GlassCard variant="light" hover className={`p-4 text-center ${glow}`}>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${iconBg} mb-2 shadow-sm icon-glow`}>
        {icon}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <div className="flex justify-center mb-1.5">
        <CircularAvatar src={photoUrl} alt={playerName} size="md" onClick={onPhotoClick} />
      </div>
      <p className="text-base font-bold text-slate-50 truncate">{playerName}</p>
      <p className="text-xs text-slate-300 mt-0.5 font-medium tabular-nums">{stat}</p>
      {barPct != null && barGradient && (
        <div className="mt-2.5 h-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${barPct}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          />
        </div>
      )}
    </GlassCard>
  );
}
