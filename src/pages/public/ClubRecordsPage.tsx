import { PagePanel } from '../../components/common/PagePanel';
import { useParentMatches } from '../../hooks/useMatches';
import { useInningsByMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useAllBallEvents } from '../../hooks/useBallEvents';
import { useMemo } from 'react';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { EmptyState } from '../../components/common/EmptyState';
import { GlassCard } from '../../components/common/GlassCard';
import { Trophy, Flame, Target, Star, TrendingUp, Users, Zap, Crown, ShieldAlert, Timer } from 'lucide-react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import type { ReactNode } from 'react';
import {
  computeBestBowlingFigures,
  computeFastestFifty,
  computeLargestSuccessfulChase,
  computeLowestTotalDefended,
  computeMostConsecutiveWins,
  computeHighestPartnership
} from '../../utils/matchAnalytics';
import { aggregateBatting, aggregateBowling } from '../../utils/seasonStatistics';
import { CountUp } from '../../components/common/CountUp';

interface ClubRecordEntry {
  label: string;
  value: string | number;
  playerName: string;
  playerPhoto: string | null;
  playerId: string | null;
  icon: ReactNode;
  gradient: string;
  subtitle?: string;
}

export function ClubRecordsPage() {
  const { data: matches = [] } = useParentMatches();
  const { data: players = [] } = usePlayers();
  const avatarViewer = useAvatarViewerStore();

  const completedMatches = useMemo(() => matches.filter((m) => m.status === 'completed'), [matches]);
  const completedMatchIds = useMemo(() => completedMatches.map((m) => m.id), [completedMatches]);
  const { data: allInnings = [] } = useInningsByMatches(completedMatchIds);
  const { data: allBallEvents = [] } = useAllBallEvents(completedMatchIds);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);

  const battingAgg = useMemo(() => aggregateBatting(allBallEvents), [allBallEvents]);
  const bowlingAgg = useMemo(() => aggregateBowling(allBallEvents), [allBallEvents]);

  const records = useMemo(() => {
    const result: ClubRecordEntry[] = [];

    // Highest Individual Score
    const topScore = [...battingAgg].sort((a, b) => b.highestScore - a.highestScore)[0];
    if (topScore && topScore.highestScore > 0) {
      result.push({
        label: 'Highest Individual Score',
        value: topScore.highestScore,
        playerName: playerMap.get(topScore.playerId) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(topScore.playerId) ?? null,
        playerId: topScore.playerId,
        icon: <Flame className="w-5 h-5" />,
        gradient: 'from-red-400 to-rose-600',
        subtitle: `${topScore.fours} fours • ${topScore.sixes} sixes`,
      });
    }

    // Most Career Runs
    const mostRuns = battingAgg[0];
    if (mostRuns && mostRuns.runs > 0) {
      const avg = mostRuns.average.toFixed(1);
      result.push({
        label: 'Most Career Runs',
        value: mostRuns.runs.toLocaleString(),
        playerName: playerMap.get(mostRuns.playerId) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(mostRuns.playerId) ?? null,
        playerId: mostRuns.playerId,
        icon: <TrendingUp className="w-5 h-5" />,
        gradient: 'from-emerald-400 to-emerald-600',
        subtitle: `Avg: ${avg} • ${mostRuns.matches} matches`,
      });
    }

    // Most Career Wickets
    const mostWickets = bowlingAgg[0];
    if (mostWickets && mostWickets.wickets > 0) {
      result.push({
        label: 'Most Career Wickets',
        value: `${mostWickets.wickets} wickets`,
        playerName: playerMap.get(mostWickets.playerId) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(mostWickets.playerId) ?? null,
        playerId: mostWickets.playerId,
        icon: <Target className="w-5 h-5" />,
        gradient: 'from-purple-400 to-purple-600',
        subtitle: `Eco: ${mostWickets.economy} • ${mostWickets.matches} matches`,
      });
    }

    // Best Single-Match Bowling Figures
    const bestSpell = computeBestBowlingFigures(allBallEvents);
    if (bestSpell && bestSpell.wickets > 0) {
      const ballsText = `${Math.floor(bestSpell.balls / 6)}.${bestSpell.balls % 6}`;
      result.push({
        label: 'Best Bowling Figures',
        value: `${bestSpell.wickets}/${bestSpell.runsConceded}`,
        playerName: playerMap.get(bestSpell.playerId) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(bestSpell.playerId) ?? null,
        playerId: bestSpell.playerId,
        icon: <Zap className="w-5 h-5" />,
        gradient: 'from-blue-400 to-indigo-600',
        subtitle: `${ballsText} overs`,
      });
    }

    // Most POTM Awards
    const potmCounts: Record<string, number> = {};
    for (const m of matches) {
      if (m.player_of_match_id) potmCounts[m.player_of_match_id] = (potmCounts[m.player_of_match_id] ?? 0) + 1;
    }
    const topPotm = Object.entries(potmCounts).sort(([, a], [, b]) => b - a)[0];
    if (topPotm && topPotm[1] > 0) {
      result.push({
        label: 'Most POTM Awards',
        value: topPotm[1],
        playerName: playerMap.get(topPotm[0]) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(topPotm[0]) ?? null,
        playerId: topPotm[0],
        icon: <Star className="w-5 h-5" />,
        gradient: 'from-amber-400 to-amber-600',
        subtitle: 'Player of the Match awards',
      });
    }

    // Highest Partnership
    const inningsGrouped = new Map<string, typeof allBallEvents>();
    for (const event of allBallEvents) {
      const list = inningsGrouped.get(event.inningsId) ?? [];
      list.push(event);
      inningsGrouped.set(event.inningsId, list);
    }
    let bestPartnership: { runs: number; balls: number; b1: string; b2: string } | null = null;
    for (const events of inningsGrouped.values()) {
      const part = computeHighestPartnership(events);
      if (part && (!bestPartnership || part.runs > bestPartnership.runs)) bestPartnership = part;
    }
    if (bestPartnership) {
      result.push({
        label: 'Highest Partnership',
        value: bestPartnership.runs,
        playerName: `${playerMap.get(bestPartnership.b1) ?? 'Batter 1'} & ${playerMap.get(bestPartnership.b2) ?? 'Batter 2'}`,
        playerPhoto: null,
        playerId: null,
        icon: <Users className="w-5 h-5" />,
        gradient: 'from-pink-400 to-pink-600',
        subtitle: `${bestPartnership.balls} balls`,
      });
    }

    // Largest Successful Chase
    const inningsRuns = new Map<string, number>();
    const inningsBalls = new Map<string, number>();
    for (const event of allBallEvents) {
      inningsRuns.set(event.inningsId, (inningsRuns.get(event.inningsId) ?? 0) + event.runsBatter + event.runsExtra);
      if (event.isLegalDelivery && event.extraType !== 'wide' && event.extraType !== 'no_ball') {
        inningsBalls.set(event.inningsId, (inningsBalls.get(event.inningsId) ?? 0) + 1);
      }
    }
    const chase = computeLargestSuccessfulChase(completedMatches, allInnings, inningsRuns, inningsBalls);
    if (chase) {
      const overs = `${Math.floor(chase.ballsUsed / 6)}.${chase.ballsUsed % 6}`;
      result.push({
        label: 'Largest Successful Chase',
        value: chase.chaseRuns,
        playerName: chase.chaserName,
        playerPhoto: null,
        playerId: null,
        icon: <Crown className="w-5 h-5" />,
        gradient: 'from-orange-400 to-orange-600',
        subtitle: `Chased ${chase.target} in ${overs} overs`,
      });
    }

    // Lowest Total Defended
    const defended = computeLowestTotalDefended(completedMatches, allInnings, inningsRuns);
    if (defended) {
      result.push({
        label: 'Lowest Total Defended',
        value: defended.total,
        playerName: defended.defenderName,
        playerPhoto: null,
        playerId: null,
        icon: <ShieldAlert className="w-5 h-5" />,
        gradient: 'from-slate-400 to-slate-600',
        subtitle: `Held off ${defended.target} to win`,
      });
    }

    // Fastest Fifty (per innings — a striker's runs must not accumulate across innings)
    const eventsByInnings = new Map<string, typeof allBallEvents>();
    for (const event of allBallEvents) {
      const list = eventsByInnings.get(event.inningsId) ?? [];
      list.push(event);
      eventsByInnings.set(event.inningsId, list);
    }
    let fastest: ReturnType<typeof computeFastestFifty> = null;
    for (const events of eventsByInnings.values()) {
      const candidate = computeFastestFifty(events);
      if (candidate && (!fastest || candidate.balls < fastest.balls)) fastest = candidate;
    }
    if (fastest) {
      result.push({
        label: 'Fastest Fifty',
        value: `${fastest.balls} balls`,
        playerName: playerMap.get(fastest.playerId) ?? 'Unknown',
        playerPhoto: playerPhotoMap.get(fastest.playerId) ?? null,
        playerId: fastest.playerId,
        icon: <Timer className="w-5 h-5" />,
        gradient: 'from-teal-400 to-cyan-600',
        subtitle: 'Balls to reach fifty',
      });
    }

    // Most Consecutive Wins
    const streak = computeMostConsecutiveWins(completedMatches);
    if (streak) {
      result.push({
        label: 'Most Consecutive Wins',
        value: streak.streak,
        playerName: streak.teamName,
        playerPhoto: null,
        playerId: null,
        icon: <Trophy className="w-5 h-5" />,
        gradient: 'from-yellow-400 to-amber-600',
        subtitle: 'Wins in a row',
      });
    }

    return result;
  }, [matches, completedMatches, allBallEvents, allInnings, playerMap, playerPhotoMap, battingAgg, bowlingAgg]);

  return (
    <div className="space-y-4">
      <PagePanel title="Club Records">
        <p className="text-xs text-slate-400 -mt-2 mb-4">All-time best performances</p>
        {records.length === 0 ? (
          <div className="rounded-2xl glass">
            <EmptyState
              icon="🏆"
              title="No records yet"
              description="Club records will appear once matches have been completed."
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 stagger-enter">
            {records.map((rec, i) => (
              <GlassCard key={i} variant="light" hover className="card-shine p-5 overflow-hidden relative group">
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${rec.gradient} opacity-10 blur-2xl transition-opacity duration-300 group-hover:opacity-25`} />
                <div className="flex items-center gap-4 relative">
                  <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${rec.gradient} shadow-xl shadow-black/30 ring-4 ring-white/10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                    <span className="[&>svg]:h-9 [&>svg]:w-9 [&>svg]:drop-shadow-lg">{rec.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{rec.label}</p>
                    <p className="text-3xl font-extrabold text-white mt-0.5 tabular-nums">
                      <AnimatedRecordValue value={rec.value} />
                    </p>
                    {rec.playerName && (
                      <div className="flex items-center gap-2 mt-1.5">
                        {rec.playerPhoto && (
                          <CircularAvatar
                            src={rec.playerPhoto}
                            alt={rec.playerName}
                            size="sm"
                            onClick={() => avatarViewer.open(rec.playerPhoto!, rec.playerName)}
                          />
                        )}
                        <span className="text-sm font-semibold text-slate-200 truncate">{rec.playerName}</span>
                      </div>
                    )}
                    {rec.subtitle && (
                      <p className="text-[11px] text-slate-400 mt-1">{rec.subtitle}</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </PagePanel>
    </div>
  );
}

function AnimatedRecordValue({ value }: { value: string | number }) {
  if (typeof value === 'number') {
    return <CountUp value={value} />;
  }
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return <>{value}</>;
  return (
    <>
      <CountUp value={Number(match[1])} />
      <span className="text-xl font-bold text-slate-400 ml-1">{match[2]}</span>
    </>
  );
}
