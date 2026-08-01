import { PagePanel } from '../../components/common/PagePanel';
import { useMatch, useInnings, useMatchPlayers } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { usePlayerStatsSource } from '../../hooks/usePlayerStatsSource';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { MatchHeroes } from '../../components/common/MatchHeroes';
import { ImpactSpotlight } from '../../components/common/ImpactSpotlight';
import { MatchInsights } from '../../components/common/MatchInsights';
import { OverChart } from '../../components/common/OverChart';
import { MatchTimeline } from '../../components/common/MatchTimeline';
import { shareMatchResult } from '../../services/shareService';
import { computeMatchImpactScore } from '../../utils/matchAnalytics';
import { POTMRecommendation } from '../../components/common/POTMRecommendation';
import { HeadToHeadSection } from '../../components/common/HeadToHeadSection';
import { CurrentBatsmenCard } from '../../components/common/CurrentBatsmenCard';
import { CurrentBowlerCard } from '../../components/common/CurrentBowlerCard';
import { MatchSituationCard } from '../../components/common/MatchSituationCard';
import { LastOverTracker } from '../../components/common/LastOverTracker';
import { PartnershipCard } from '../../components/common/PartnershipCard';
import { LiveCommentary } from '../../components/common/LiveCommentary';
import { MatchFormatBadge } from '../../components/common/MatchFormatBadge';
import { TeamStrengthMeter } from '../../components/common/TeamStrengthMeter';
import { SkeletonScorecard } from '../../components/common/Skeleton';

export function MatchSummaryPage() {
  const { matchId = '' } = useParams();
  const { data: match, isLoading: matchLoading, error: matchError } = useMatch(matchId);
  const { data: inningsList = [], isLoading: inningsLoading } = useInnings(matchId);
  const { data: matchPlayers = [], isLoading: playersLoading } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);

  const innings1 = inningsList.find((i) => i.innings_number === 1);
  const innings2 = inningsList.find((i) => i.innings_number === 2);

  // Get ball events for both innings
  const { data: ballEvents1 = [] } = useBallEvents(innings1?.id ?? null);
  const { data: ballEvents2 = [] } = useBallEvents(innings2?.id ?? null);

  // Calculate innings stats
  const innings1Stats = useMemo(() => {
    if (!innings1 || !match) return null;
    const batting = matchPlayers.filter((mp) => mp.team === innings1.batting_team);
    const battingOrder = batting.map((mp) => mp.player_id);

    let striker: string | undefined;
    let nonStriker: string | undefined;

    if (ballEvents1.length > 0) {
      const firstEvt = [...ballEvents1].sort((a, b) => a.sequenceNumber - b.sequenceNumber)[0];
      striker = firstEvt.strikerId;
      nonStriker = firstEvt.nonStrikerId;
    } else {
      striker = battingOrder[0];
      nonStriker = battingOrder[1];
    }

    if (!striker || !nonStriker) return null;

    const context: ScoringContext = {
      inningsId: innings1.id,
      openingStrikerId: striker,
      openingNonStrikerId: nonStriker,
      battingOrder,
      oversPerInnings: match.overs_per_innings,
      playersPerTeam: match.players_per_team,
      targetRuns: null
    };

    try {
      return calculateInningsState(context, ballEvents1);
    } catch {
      return null;
    }
  }, [innings1, match, ballEvents1, matchPlayers]);

  const innings2Stats = useMemo(() => {
    if (!innings2 || !match) return null;
    const batting = matchPlayers.filter((mp) => mp.team === innings2.batting_team);
    const battingOrder = batting.map((mp) => mp.player_id);

    let striker: string | undefined;
    let nonStriker: string | undefined;

    if (ballEvents2.length > 0) {
      const firstEvt = [...ballEvents2].sort((a, b) => a.sequenceNumber - b.sequenceNumber)[0];
      striker = firstEvt.strikerId;
      nonStriker = firstEvt.nonStrikerId;
    } else {
      striker = battingOrder[0];
      nonStriker = battingOrder[1];
    }

    if (!striker || !nonStriker) return null;

    const context: ScoringContext = {
      inningsId: innings2.id,
      openingStrikerId: striker,
      openingNonStrikerId: nonStriker,
      battingOrder,
      oversPerInnings: match.overs_per_innings,
      playersPerTeam: match.players_per_team,
      targetRuns: innings2.target_runs
    };

    try {
      return calculateInningsState(context, ballEvents2);
    } catch {
      return null;
    }
  }, [innings2, match, ballEvents2, matchPlayers]);

  const topBatter = useMemo(() => {
    if (!innings1Stats && !innings2Stats) return null;
    const all = [
      ...Object.values(innings1Stats?.battingStats ?? {}),
      ...Object.values(innings2Stats?.battingStats ?? {})
    ];
    return all.reduce(
      (max, batter) => (batter.runs > (max?.runs ?? 0) ? batter : max),
      all[0]
    );
  }, [innings1Stats, innings2Stats]);

  const topBowler = useMemo(() => {
    if (!innings1Stats && !innings2Stats) return null;
    const all = [
      ...Object.values(innings1Stats?.bowlingStats ?? {}),
      ...Object.values(innings2Stats?.bowlingStats ?? {})
    ];
    return all.reduce(
      (max, bowler) => (bowler.wickets > (max?.wickets ?? 0) ? bowler : max),
      all[0]
    );
  }, [innings1Stats, innings2Stats]);

  const impactCandidates = useMemo(() => {
    if (!match) return [];
    return computeMatchImpactScore({
      match,
      innings1Stats,
      innings2Stats,
      ballEvents1,
      ballEvents2,
      playerMap
    });
  }, [match, innings1Stats, innings2Stats, ballEvents1, ballEvents2, playerMap]);

  const allBallEvents = useMemo(() => [...ballEvents1, ...ballEvents2], [ballEvents1, ballEvents2]);

  const chasePlayerIds = useMemo(() => {
    if (!match || !innings2) return new Set<string>();
    return new Set(
      matchPlayers.filter((mp) => mp.team === innings2.batting_team).map((mp) => mp.player_id)
    );
  }, [match, innings2, matchPlayers]);

  const chaseState = useMemo(() => {
    if (!innings2Stats || !innings2 || !match) return null;
    return {
      totalRuns: innings2Stats.totalRuns,
      wickets: innings2Stats.wickets,
      targetRuns: innings2.target_runs ?? 0,
      legalBalls: innings2Stats.legalBalls,
      oversPerInnings: match.overs_per_innings,
    };
  }, [innings2Stats, innings2, match]);

  const isLive = match?.status === 'in_progress';

  // Determine active innings for live matches
  const activeInnings = useMemo(() => {
    if (!isLive) return null;
    return inningsList.find(i => i.status === 'in_progress') ?? null;
  }, [inningsList, isLive]);

  // Get ball events for active innings
  const { data: activeBallEvents = [] } = useBallEvents(activeInnings?.id ?? null);

  // Calculate innings state for active innings with proper context
  const activeInningsState = useMemo(() => {
    if (!activeInnings || !match) return null;
    if (activeBallEvents.length === 0) return null;

    const batting = matchPlayers.filter(mp => mp.team === activeInnings.batting_team);
    const battingOrder = batting.map(mp => mp.player_id);
    const firstEvent = [...activeBallEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber)[0];
    if (!firstEvent) return null;

    const context: ScoringContext = {
      inningsId: activeInnings.id,
      openingStrikerId: firstEvent.strikerId,
      openingNonStrikerId: firstEvent.nonStrikerId,
      battingOrder,
      oversPerInnings: match.overs_per_innings,
      playersPerTeam: match.players_per_team,
      targetRuns: activeInnings.target_runs,
    };

    try {
      return calculateInningsState(context, activeBallEvents);
    } catch {
      return null;
    }
  }, [activeInnings, match, activeBallEvents, matchPlayers]);

  const isLoading = matchLoading || inningsLoading || playersLoading;

  const { source: teamSource, isLoading: strengthLoading } = usePlayerStatsSource();

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <SkeletonScorecard />
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-300">
        <p className="font-semibold">Error</p>
        <p className="text-sm">Unable to load match summary.</p>
      </div>
    );
  }

  if (['draft', 'scheduled', 'teams_created', 'abandoned'].includes(match.status)) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PagePanel title="Match Details">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-50">{match.match_name}</h2>
            <p className="text-sm text-slate-300">{match.match_date} • {match.venue || 'No Venue'}</p>
            <p className="text-slate-200">
              <span className="font-semibold">{match.team_a_name}</span> vs <span className="font-semibold">{match.team_b_name}</span>
            </p>
            <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg text-amber-300 text-sm font-semibold">
              {match.status.replace('_', ' ').charAt(0).toUpperCase() + match.status.replace('_', ' ').slice(1)}
            </div>
          </div>
        </PagePanel>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Match Header */}
      <PagePanel title="Match Summary">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-slate-50">{match.match_name}</h2>
              <MatchFormatBadge format={match.match_format} />
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300 border border-red-500/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{match.match_date} • {match.venue || 'No Venue'}</p>
          </div>

          {/* Result Banner */}
          {match.result_text && !isLive && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <p className="text-lg font-bold text-emerald-400">{match.result_text}</p>
            </div>
          )}

          {/* Match Timeline */}
          {!isLive && (
            <MatchTimeline
              matchStatus={match.status}
              innings1Status={innings1?.status}
              innings2Status={innings2?.status}
              resultText={match.result_text}
            />
          )}

          {/* Team Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Innings 1 */}
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-slate-200 mb-2">{innings1 ? (innings1.batting_team === 'team_a' ? match.team_a_name : match.team_b_name) : 'Team'}</h3>
              {innings1Stats ? (
                <div>
                  <div className="text-3xl font-bold text-teal-400">
                    {innings1Stats.totalRuns}/{innings1Stats.wickets}
              </div>
                  <p className="text-xs text-slate-400 mt-1">{innings1Stats.oversDisplay} overs</p>
                  {isLive && <p className="text-xs text-slate-400">CRR: {innings1Stats.currentRunRate}</p>}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">-</p>
              )}
            </div>

            {/* Innings 2 */}
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-semibold text-slate-200 mb-2">{innings2 ? (innings2.batting_team === 'team_a' ? match.team_a_name : match.team_b_name) : 'Team'}</h3>
              {innings2Stats ? (
                <div>
                  <div className="text-3xl font-bold text-teal-400">
                    {innings2Stats.totalRuns}/{innings2Stats.wickets}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{innings2Stats.oversDisplay} overs</p>
                  {isLive && (
                    <>
                      <p className="text-xs text-slate-400">CRR: {innings2Stats.currentRunRate}</p>
                      {innings2 && <p className="text-xs font-semibold text-amber-300">Target: {innings2.target_runs}</p>}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">-</p>
              )}
            </div>
          </div>
        </div>
      </PagePanel>

      {/* Team Strength */}
      <PagePanel title="Team Strength">
        {strengthLoading ? (
          <div className="space-y-3">
            <div className="h-28 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
            <div className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
          </div>
        ) : (
          <TeamStrengthMeter
            teamAName={match.team_a_name}
            teamBName={match.team_b_name}
            matches={teamSource.matches}
            ballEvents={teamSource.events}
            matchPlayers={teamSource.matchPlayers}
            currentMatchPlayers={matchPlayers}
            availability={teamSource.allAvailability}
            currentMatchId={matchId}
            playersPerTeam={match.players_per_team}
          />
        )}
      </PagePanel>

      {/* Live Scoreboard */}
      {isLive && activeInningsState && (
        <div className="space-y-3 animate-fade-in">
          {/* Compact Score Header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {activeInnings?.innings_number === 1 ? '1st Innings' : '2nd Innings'}
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    {activeInningsState.totalRuns}<span className="text-slate-400 font-bold">/{activeInningsState.wickets}</span>
                  </span>
                  <span className="text-slate-400 text-xs font-medium">
                    ({activeInningsState.oversDisplay} ov)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeInnings?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-300 border border-red-500/30 animate-live-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <CurrentBatsmenCard
            inningsState={activeInningsState}
            playerMap={playerMap}
            playerPhotoMap={playerPhotoMap}
            battingTeamName={activeInnings?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}
          />

          <CurrentBowlerCard
            inningsState={activeInningsState}
            playerMap={playerMap}
            playerPhotoMap={playerPhotoMap}
            bowlingTeamName={activeInnings?.bowling_team === 'team_a' ? match.team_a_name : match.team_b_name}
          />

          <MatchSituationCard
            inningsState={activeInningsState}
            targetRuns={activeInnings?.target_runs ?? null}
            oversPerInnings={match.overs_per_innings}
          />

          <PartnershipCard
            ballEvents={activeBallEvents}
            strikerId={activeInningsState.strikerId}
            nonStrikerId={activeInningsState.nonStrikerId}
          />

          <LastOverTracker
            ballEvents={activeBallEvents}
            legalBalls={activeInningsState.legalBalls}
          />

          <LiveCommentary
            ballEvents={activeBallEvents}
            playerMap={playerMap}
          />
        </div>
      )}

      {/* Match Heroes */}
      {!isLive && (
        <PagePanel title="Match Heroes">
          <MatchHeroes
            match={match}
            innings1Stats={innings1Stats}
            innings2Stats={innings2Stats}
            ballEvents1={ballEvents1}
            ballEvents2={ballEvents2}
            impactCandidates={impactCandidates}
            playerMap={playerMap}
            playerPhotoMap={playerPhotoMap}
          />

          {allBallEvents.length > 0 && (
            <div className="mt-4">
              <POTMRecommendation
                events={allBallEvents}
                playerMap={playerMap}
                chasePlayerIds={chasePlayerIds}
                chaseState={chaseState}
                photoMap={playerPhotoMap}
              />
              {match.player_of_match_id && (
                <p className="mt-2 text-[10px] text-slate-400 text-center">
                  Official pick: <span className="font-bold text-slate-300">{playerMap.get(match.player_of_match_id) ?? 'Player'}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                const s1 = innings1Stats ? `${innings1Stats.totalRuns}/${innings1Stats.wickets} (${innings1Stats.oversDisplay} ov)` : '-';
                const s2 = innings2Stats ? `${innings2Stats.totalRuns}/${innings2Stats.wickets} (${innings2Stats.oversDisplay} ov)` : '-';
                const potm = match.player_of_match_id ? playerMap.get(match.player_of_match_id) ?? null : null;
                void shareMatchResult(match, s1, s2, potm);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500/15 px-4 py-2 text-sm font-semibold text-teal-300 hover:bg-teal-500/25 transition-colors border border-teal-400/20"
            >
              <Share2 className="w-4 h-4" /> Share Result
            </button>
          </div>
        </PagePanel>
      )}

      {/* Spotlight */}
      {!isLive && (
        <ImpactSpotlight
          candidate={impactCandidates[0] ?? null}
          potmName={match.player_of_match_id ? playerMap.get(match.player_of_match_id) ?? null : null}
          potmPhoto={match.player_of_match_id ? playerPhotoMap.get(match.player_of_match_id) ?? null : null}
          matchResult={match.result_text}
        />
      )}

      {/* Key Performances */}
      <PagePanel title="Key Performances">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Batter */}
          {topBatter && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Batter</p>
              <p className="text-lg font-bold text-slate-50 mt-1">{playerMap.get(topBatter.playerId) ?? 'Player'}</p>
              <p className="text-sm text-slate-300 mt-1">{topBatter.runs} runs ({topBatter.balls}b)</p>
            </div>
          )}

          {/* Top Bowler */}
          {topBowler && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Bowler</p>
              <p className="text-lg font-bold text-slate-50 mt-1">{playerMap.get(topBowler.playerId) ?? 'Player'}</p>
              <p className="text-sm text-slate-300 mt-1">{topBowler.wickets} wickets ({topBowler.oversDisplay} ov)</p>
            </div>
          )}

          {/* Match Info */}
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Match Type</p>
            <p className="text-lg font-bold text-slate-50 mt-1">{match.overs_per_innings} Overs</p>
            <p className="text-sm text-slate-300 mt-1">{match.players_per_team} a side</p>
          </div>
        </div>
      </PagePanel>

      {/* Match Insights */}
      {!isLive && (
        <PagePanel title="Match Insights">
          <MatchInsights
            match={match}
            ballEvents1={ballEvents1}
            ballEvents2={ballEvents2}
            innings1Stats={innings1Stats}
            innings2Stats={innings2Stats}
            playerMap={playerMap}
          />
        </PagePanel>
      )}

      {/* Head to Head */}
      <PagePanel title="Head to Head">
        <HeadToHeadSection teamAName={match.team_a_name} teamBName={match.team_b_name} />
      </PagePanel>

      {/* Innings Summary Panels */}
      {innings1Stats && (
        <PagePanel title={`${innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} - 1st Innings`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">Runs</p>
              <p className="text-2xl font-bold text-teal-400 mt-1">{innings1Stats.totalRuns}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">Wickets</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{innings1Stats.wickets}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">Overs</p>
              <p className="text-2xl font-bold text-slate-200 mt-1">{innings1Stats.oversDisplay}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">Run Rate</p>
              <p className="text-2xl font-bold text-slate-200 mt-1">{innings1Stats.currentRunRate}</p>
            </div>
          </div>
          <div className="mt-4">
            <OverChart
              ballEvents={ballEvents1}
              oversPerInnings={match.overs_per_innings}
              battingTeamName={innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}
            />
          </div>
        </PagePanel>
      )}

      {innings2Stats && (
        <PagePanel title={`${innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} - 2nd Innings`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">Runs</p>
              <p className="text-2xl font-bold text-teal-400 mt-1">{innings2Stats.totalRuns}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">Wickets</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{innings2Stats.wickets}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">Overs</p>
              <p className="text-2xl font-bold text-slate-200 mt-1">{innings2Stats.oversDisplay}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">Run Rate</p>
              <p className="text-2xl font-bold text-slate-200 mt-1">{innings2Stats.currentRunRate}</p>
            </div>
          </div>
          <div className="mt-4">
            <OverChart
              ballEvents={ballEvents2}
              oversPerInnings={match.overs_per_innings}
              battingTeamName={innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}
            />
          </div>
        </PagePanel>
      )}
    </div>
  );
}
