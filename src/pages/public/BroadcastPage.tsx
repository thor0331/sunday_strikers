import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize, RadioTower } from 'lucide-react';
import { useMatch, useInnings, useMatchPlayers } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { useBallEventDelta } from '../../hooks/useBallEventDelta';
import { useSpectatorNotifications } from '../../hooks/useSpectatorNotifications';
import { NotificationToast } from '../../components/common/NotificationToast';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { BroadcastScoreBoard } from '../../components/common/BroadcastScoreBoard';
import { BroadcastOverlays } from '../../components/common/BroadcastOverlays';
import { CurrentBatsmenCard } from '../../components/common/CurrentBatsmenCard';
import { CurrentBowlerCard } from '../../components/common/CurrentBowlerCard';
import { MatchSituationCard } from '../../components/common/MatchSituationCard';
import { PartnershipCard } from '../../components/common/PartnershipCard';
import { LastOverTracker } from '../../components/common/LastOverTracker';
import { LiveCommentary } from '../../components/common/LiveCommentary';
import { WormGraph } from '../../components/common/WormGraph';
import { SkeletonScorecard } from '../../components/common/Skeleton';
import type { BallEvent, DerivedInningsState, Innings, Match, MatchPlayer } from '../../types/models';

function buildInningsState(
  innings: Innings | undefined,
  ballEvents: BallEvent[],
  match: Match | undefined,
  matchPlayers: MatchPlayer[],
  targetRuns: number | null
): DerivedInningsState | null {
  if (!innings || !match) return null;
  if (ballEvents.length === 0) return null;

  const batting = matchPlayers.filter((mp) => mp.team === innings.batting_team);
  const battingOrder = batting.map((mp) => mp.player_id);
  const firstEvent = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber)[0];
  const striker = firstEvent?.strikerId ?? battingOrder[0];
  const nonStriker = firstEvent?.nonStrikerId ?? battingOrder[1];
  if (!striker || !nonStriker) return null;

  const context: ScoringContext = {
    inningsId: innings.id,
    openingStrikerId: striker,
    openingNonStrikerId: nonStriker,
    battingOrder,
    oversPerInnings: match.overs_per_innings,
    playersPerTeam: match.players_per_team,
    targetRuns,
  };

  try {
    return calculateInningsState(context, ballEvents);
  } catch {
    return null;
  }
}

export function BroadcastPage() {
  const { matchId = '' } = useParams();
  const { data: match, isLoading } = useMatch(matchId);
  const { data: inningsList = [] } = useInnings(matchId);
  const { data: matchPlayers = [] } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void rootRef.current?.requestFullscreen().catch(() => {});
    }
  };

  const innings1 = inningsList.find((i) => i.innings_number === 1);
  const innings2 = inningsList.find((i) => i.innings_number === 2);

  const { data: ballEvents1 = [] } = useBallEvents(innings1?.id ?? null);
  const { data: ballEvents2 = [] } = useBallEvents(innings2?.id ?? null);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);

  const innings1Stats = useMemo(
    () => buildInningsState(innings1, ballEvents1, match, matchPlayers, null),
    [innings1, ballEvents1, match, matchPlayers]
  );
  const innings2Stats = useMemo(
    () => buildInningsState(innings2, ballEvents2, match, matchPlayers, innings2?.target_runs ?? null),
    [innings2, ballEvents2, match, matchPlayers]
  );

  const activeInnings = useMemo(() => {
    if (!match) return null;
    const live = inningsList.find((i) => i.status === 'in_progress');
    if (live) return live;
    return inningsList[inningsList.length - 1] ?? null;
  }, [match, inningsList]);

  const activeStats = useMemo(() => {
    if (!activeInnings) return null;
    return activeInnings.innings_number === 1 ? innings1Stats : innings2Stats;
  }, [activeInnings, innings1Stats, innings2Stats]);

  const activeBallEvents = useMemo(() => {
    if (!activeInnings) return [];
    return activeInnings.innings_number === 1 ? ballEvents1 : ballEvents2;
  }, [activeInnings, ballEvents1, ballEvents2]);

  const delta = useBallEventDelta(activeBallEvents);

  const notifications = useSpectatorNotifications({
    delta,
    ballEvents: activeBallEvents,
    state: activeStats,
    playerMap,
    resultText: match?.result_text ?? null,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07111F] px-4 py-6">
        <SkeletonScorecard />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#07111F] px-4 py-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          Unable to load this broadcast.{' '}
          <Link to="/matches" className="font-semibold underline">
            Back to matches
          </Link>
        </div>
      </div>
    );
  }

  const battingTeamName = activeInnings
    ? activeInnings.batting_team === 'team_a'
      ? match.team_a_name
      : match.team_b_name
    : match.team_a_name;
  const bowlingTeamName = activeInnings
    ? activeInnings.bowling_team === 'team_a'
      ? match.team_a_name
      : match.team_b_name
    : match.team_b_name;

  return (
    <div ref={rootRef} className="min-h-screen bg-[#07111F] text-white">
      {/* Broadcast top bar (replaces app header/nav/footer) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111F]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to={`/matches/${matchId}`}
              className="btn-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Back to match"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                <RadioTower className="h-4 w-4 shrink-0 text-red-400" />
                <span className="truncate">{match.match_name}</span>
              </p>
              <p className="truncate text-[10px] text-slate-400">
                {match.match_date}
                {match.venue ? ` • ${match.venue}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="btn-press inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {activeInnings && activeStats ? (
          <>
            <BroadcastScoreBoard
              match={match}
              innings={activeInnings}
              state={activeStats}
              battingTeamName={battingTeamName}
              bowlingTeamName={bowlingTeamName}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <CurrentBatsmenCard
                inningsState={activeStats}
                playerMap={playerMap}
                playerPhotoMap={playerPhotoMap}
                battingTeamName={battingTeamName}
              />
              <CurrentBowlerCard
                inningsState={activeStats}
                playerMap={playerMap}
                playerPhotoMap={playerPhotoMap}
                bowlingTeamName={bowlingTeamName}
              />
              <MatchSituationCard
                inningsState={activeStats}
                targetRuns={activeInnings.target_runs ?? null}
                oversPerInnings={match.overs_per_innings}
              />
              <div className="space-y-4">
                <PartnershipCard
                  ballEvents={activeBallEvents}
                  strikerId={activeStats.strikerId}
                  nonStrikerId={activeStats.nonStrikerId}
                />
                <LastOverTracker ballEvents={activeBallEvents} legalBalls={activeStats.legalBalls} />
              </div>
              <div className="lg:col-span-2">
                <LiveCommentary ballEvents={activeBallEvents} playerMap={playerMap} />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <p className="text-sm text-slate-300">No ball-by-ball data available for this match yet.</p>
            <Link
              to={`/matches/${matchId}`}
              className="mt-2 inline-block text-xs font-semibold text-teal-400 hover:text-teal-300"
            >
              Back to match summary
            </Link>
          </div>
        )}

        <WormGraph
          team1Name={match.team_a_name}
          team2Name={match.team_b_name}
          ballEvents1={ballEvents1}
          ballEvents2={ballEvents2}
          targetRuns={innings2?.target_runs ?? null}
          totalOvers={match.overs_per_innings}
          playerMap={playerMap}
        />
      </main>

      <BroadcastOverlays delta={delta} state={activeStats} />
      <NotificationToast notifications={notifications} />
    </div>
  );
}
