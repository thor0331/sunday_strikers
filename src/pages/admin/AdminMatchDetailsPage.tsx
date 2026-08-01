import { PagePanel } from '../../components/common/PagePanel';
import { useMatch, useInnings, useMatchPlayers } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { MatchHeroes } from '../../components/common/MatchHeroes';
import { ImpactSpotlight } from '../../components/common/ImpactSpotlight';
import { MatchInsights } from '../../components/common/MatchInsights';
import { OverChart } from '../../components/common/OverChart';
import { MatchTimeline } from '../../components/common/MatchTimeline';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { Button } from '../../components/forms/Button';
import { shareMatchResult } from '../../services/shareService';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { computeMatchImpactScore } from '../../utils/matchAnalytics';
import { HeadToHeadSection } from '../../components/common/HeadToHeadSection';
import { POTMRecommendation } from '../../components/common/POTMRecommendation';
import { Share2, Star } from 'lucide-react';
import { SkeletonScorecard } from '../../components/common/Skeleton';

export function AdminMatchDetailsPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading: matchLoading } = useMatch(matchId);
  const { data: inningsList = [] } = useInnings(matchId);
  const { data: matchPlayers = [] } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();

  const avatarViewer = useAvatarViewerStore();
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);
  const playerPhotoMap = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);

  const innings1 = inningsList.find((i) => i.innings_number === 1);
  const innings2 = inningsList.find((i) => i.innings_number === 2);

  const { data: ballEvents1 = [] } = useBallEvents(innings1?.id ?? null);
  const { data: ballEvents2 = [] } = useBallEvents(innings2?.id ?? null);

  // Calculate innings states
  const innings1Stats = useMemo(() => {
    if (!innings1 || !match) return null;
    const batting = matchPlayers.filter((mp) => mp.team === innings1.batting_team);
    const battingOrder = batting.map((mp) => mp.player_id);
    if (ballEvents1.length === 0) return null;

    const firstEvent = ballEvents1[0];
    const context: ScoringContext = {
      inningsId: innings1.id,
      openingStrikerId: firstEvent.strikerId,
      openingNonStrikerId: firstEvent.nonStrikerId,
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
    if (ballEvents2.length === 0) return null;

    const firstEvent = ballEvents2[0];
    const context: ScoringContext = {
      inningsId: innings2.id,
      openingStrikerId: firstEvent.strikerId,
      openingNonStrikerId: firstEvent.nonStrikerId,
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

  const isLoading = matchLoading;

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

  const potmParams = useMemo(() => {
    if (!match || !innings2 || allBallEvents.length === 0) return null;
    const chasePlayerIds = new Set(
      matchPlayers.filter((mp) => mp.team === innings2.batting_team).map((mp) => mp.player_id)
    );
    return {
      events: allBallEvents,
      chasePlayerIds,
      chaseState: innings2Stats
        ? {
            totalRuns: innings2Stats.totalRuns,
            wickets: innings2Stats.wickets,
            targetRuns: innings2.target_runs ?? 0,
            legalBalls: innings2Stats.legalBalls,
            oversPerInnings: match.overs_per_innings,
          }
        : null,
    };
  }, [match, innings2, allBallEvents, matchPlayers, innings2Stats]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <SkeletonScorecard />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-300">
        <p className="font-semibold">Match Not Found</p>
      </div>
    );
  }

  if (match.status !== 'completed') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-slate-300 hover:text-slate-100 font-medium mb-4"
        >
          ← Back to Admin
        </button>
        <PagePanel title="Match Details">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-50">{match.match_name}</h2>
            <p className="text-sm text-slate-300">{match.match_date} • {match.venue || 'No Venue'}</p>
            <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg text-amber-300 text-sm font-semibold">
              This match has not been completed yet.
            </div>
          </div>
        </PagePanel>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-container max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/admin')}
        className="text-sm text-slate-300 hover:text-slate-100 font-medium"
      >
        ← Back to Admin
      </button>

      {/* Match Information Panel */}
      <PagePanel title="Match Information">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">Match Name</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{match.match_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">Date</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{match.match_date}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">Venue</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{match.venue || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">Format</p>
            <p className="text-lg font-bold text-slate-100 mt-1">{match.overs_per_innings} overs • {match.players_per_team} a side</p>
          </div>
        </div>
      </PagePanel>

      {/* Match Timeline */}
      <MatchTimeline
        matchStatus={match.status}
        innings1Status={innings1?.status}
        innings2Status={innings2?.status}
        resultText={match.result_text}
      />

      {/* Result Panel */}
      <PagePanel title="Result">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
            <p className="text-xs text-slate-400 uppercase font-bold">Result</p>
            <p className="text-xl font-bold text-emerald-400 mt-2">{match.result_text || 'No result'}</p>
          </div>
          <div className="rounded-lg bg-white/[0.05] border border-white/10 p-4">
            <p className="text-xs text-slate-400 uppercase font-bold">Toss</p>
            <p className="text-lg font-bold text-slate-100 mt-2">
              {match.toss_winner === 'team_a' ? match.team_a_name : match.team_b_name} won • {match.toss_decision === 'bat' ? 'Chose to bat' : 'Chose to bowl'}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-amber-400/10 border border-amber-400/20 p-4">
            <div className="flex items-center gap-3">
              <CircularAvatar
                src={match.player_of_match_id ? playerPhotoMap.get(match.player_of_match_id) ?? null : null}
                alt={match.player_of_match_id ? playerMap.get(match.player_of_match_id) ?? 'POTM' : 'POTM'}
                size="md"
                onClick={() => {
                  if (match.player_of_match_id) {
                    const url = playerPhotoMap.get(match.player_of_match_id);
                    const name = playerMap.get(match.player_of_match_id);
                    if (url) avatarViewer.open(url, name ?? 'POTM');
                  }
                }}
              />
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Player of the Match</p>
                <p className="text-lg font-bold text-amber-300 mt-1">
                  {match.player_of_match_id
                    ? playerMap.get(match.player_of_match_id) ?? 'Unknown Player'
                    : 'Not Selected'}
                </p>
              </div>
              <Star className="w-5 h-5 text-amber-400 ml-auto" />
            </div>
            {potmParams && (
              <div className="mt-3">
                <POTMRecommendation
                  events={potmParams.events}
                  playerMap={playerMap}
                  chasePlayerIds={potmParams.chasePlayerIds}
                  chaseState={potmParams.chaseState}
                  photoMap={playerPhotoMap}
                />
              </div>
            )}
        </div>
      </PagePanel>

      {/* Spotlight */}
      <ImpactSpotlight
        candidate={impactCandidates[0] ?? null}
        potmName={match.player_of_match_id ? playerMap.get(match.player_of_match_id) ?? null : null}
        potmPhoto={match.player_of_match_id ? playerPhotoMap.get(match.player_of_match_id) ?? null : null}
        matchResult={match.result_text}
        onPhotoClick={() => {
          if (!match.player_of_match_id) return;
          const url = playerPhotoMap.get(match.player_of_match_id);
          if (url) avatarViewer.open(url, playerMap.get(match.player_of_match_id) ?? 'POTM');
        }}
      />

      {/* Match Heroes */}
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
        <div className="mt-3">
          <Button
            onClick={() => {
              const s1 = innings1Stats ? `${innings1Stats.totalRuns}/${innings1Stats.wickets} (${innings1Stats.oversDisplay} ov)` : '-';
              const s2 = innings2Stats ? `${innings2Stats.totalRuns}/${innings2Stats.wickets} (${innings2Stats.oversDisplay} ov)` : '-';
              const potm = match.player_of_match_id ? playerMap.get(match.player_of_match_id) ?? null : null;
              void shareMatchResult(match, s1, s2, potm);
            }}
          >
            <Share2 className="h-4 w-4" /> Share Result
          </Button>
        </div>
      </PagePanel>

      {/* Match Insights */}
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

      {/* Head to Head */}
      <PagePanel title="Head to Head">
        <HeadToHeadSection teamAName={match.team_a_name} teamBName={match.team_b_name} />
      </PagePanel>

      {/* Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Innings 1 Scorecard */}
        {innings1Stats && (
          <PagePanel title={`${innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} Batting`}>
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/10">
                <div className="text-center">
                  <p className="text-xs text-slate-400">Runs</p>
                  <p className="text-2xl font-bold text-teal-400">{innings1Stats.totalRuns}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Wickets</p>
                  <p className="text-2xl font-bold text-red-400">{innings1Stats.wickets}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Overs</p>
                  <p className="text-2xl font-bold text-slate-300">{innings1Stats.oversDisplay}</p>
                </div>
              </div>

              {/* Batting Table */}
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[1fr_2rem_2rem_1rem_1rem_2rem] gap-2 font-bold text-xs text-slate-300 uppercase pb-2 border-b border-white/10">
                  <div>Batter</div>
                  <div className="text-right">R</div>
                  <div className="text-right">B</div>
                  <div className="text-right">4</div>
                  <div className="text-right">6</div>
                  <div className="text-right">SR</div>
                </div>
                {Object.entries(innings1Stats.battingStats).map(([playerId, stats]) => (
                  <div key={playerId} className="grid grid-cols-[1fr_2rem_2rem_1rem_1rem_2rem] gap-2 py-1 border-b border-white/10">
                    <div className={stats.isOut ? 'text-slate-400 line-through' : 'font-semibold text-slate-200'}>
                      {playerMap.get(playerId)}
                    </div>
                    <div className="text-right font-bold">{stats.runs}</div>
                    <div className="text-right">{stats.balls}</div>
                    <div className="text-right">{stats.fours}</div>
                    <div className="text-right">{stats.sixes}</div>
                    <div className="text-right">{stats.strikeRate.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <OverChart
                  ballEvents={ballEvents1}
                  oversPerInnings={match.overs_per_innings}
                  battingTeamName={innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}
                />
              </div>
            </div>
          </PagePanel>
        )}

        {/* Innings 2 Scorecard */}
        {innings2Stats && (
          <PagePanel title={`${innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} Batting`}>
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/10">
                <div className="text-center">
                  <p className="text-xs text-slate-400">Runs</p>
                  <p className="text-2xl font-bold text-teal-400">{innings2Stats.totalRuns}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Wickets</p>
                  <p className="text-2xl font-bold text-red-400">{innings2Stats.wickets}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Overs</p>
                  <p className="text-2xl font-bold text-slate-300">{innings2Stats.oversDisplay}</p>
                </div>
              </div>

              {/* Batting Table */}
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[1fr_2rem_2rem_1rem_1rem_2rem] gap-2 font-bold text-xs text-slate-300 uppercase pb-2 border-b border-white/10">
                  <div>Batter</div>
                  <div className="text-right">R</div>
                  <div className="text-right">B</div>
                  <div className="text-right">4</div>
                  <div className="text-right">6</div>
                  <div className="text-right">SR</div>
                </div>
                {Object.entries(innings2Stats.battingStats).map(([playerId, stats]) => (
                  <div key={playerId} className="grid grid-cols-[1fr_2rem_2rem_1rem_1rem_2rem] gap-2 py-1 border-b border-white/10">
                    <div className={stats.isOut ? 'text-slate-400 line-through' : 'font-semibold text-slate-200'}>
                      {playerMap.get(playerId)}
                    </div>
                    <div className="text-right font-bold">{stats.runs}</div>
                    <div className="text-right">{stats.balls}</div>
                    <div className="text-right">{stats.fours}</div>
                    <div className="text-right">{stats.sixes}</div>
                    <div className="text-right">{stats.strikeRate.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <OverChart
                  ballEvents={ballEvents2}
                  oversPerInnings={match.overs_per_innings}
                  battingTeamName={innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}
                />
              </div>
            </div>
          </PagePanel>
        )}
      </div>

      {/* Bowling Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Innings 1 Bowling */}
        {innings1Stats && (
          <PagePanel title={`${innings1?.bowling_team === 'team_a' ? match.team_a_name : match.team_b_name} Bowling`}>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-[2fr_1rem_1.5rem_1.5rem_1rem_1.5rem] gap-2 font-bold text-xs text-slate-300 uppercase pb-2 border-b border-white/10">
                <div>Bowler</div>
                <div className="text-right">O</div>
                <div className="text-right">M</div>
                <div className="text-right">R</div>
                <div className="text-right">W</div>
                <div className="text-right">Eco</div>
              </div>
              {Object.entries(innings1Stats.bowlingStats).map(([playerId, stats]) => (
                <div key={playerId} className="grid grid-cols-[2fr_1rem_1.5rem_1.5rem_1rem_1.5rem] gap-2 py-1 border-b border-white/10">
                  <div className="font-semibold text-slate-200 truncate">{playerMap.get(playerId)}</div>
                  <div className="text-right">{stats.oversDisplay}</div>
                  <div className="text-right">{stats.maidens}</div>
                  <div className="text-right">{stats.runsConceded}</div>
                  <div className="text-right font-bold">{stats.wickets}</div>
                  <div className="text-right">{stats.economy.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </PagePanel>
        )}

        {/* Innings 2 Bowling */}
        {innings2Stats && (
          <PagePanel title={`${innings2?.bowling_team === 'team_a' ? match.team_a_name : match.team_b_name} Bowling`}>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-[2fr_1rem_1.5rem_1.5rem_1rem_1.5rem] gap-2 font-bold text-xs text-slate-300 uppercase pb-2 border-b border-white/10">
                <div>Bowler</div>
                <div className="text-right">O</div>
                <div className="text-right">M</div>
                <div className="text-right">R</div>
                <div className="text-right">W</div>
                <div className="text-right">Eco</div>
              </div>
              {Object.entries(innings2Stats.bowlingStats).map(([playerId, stats]) => (
                <div key={playerId} className="grid grid-cols-[2fr_1rem_1.5rem_1.5rem_1rem_1.5rem] gap-2 py-1 border-b border-white/10">
                  <div className="font-semibold text-slate-200 truncate">{playerMap.get(playerId)}</div>
                  <div className="text-right">{stats.oversDisplay}</div>
                  <div className="text-right">{stats.maidens}</div>
                  <div className="text-right">{stats.runsConceded}</div>
                  <div className="text-right font-bold">{stats.wickets}</div>
                  <div className="text-right">{stats.economy.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </PagePanel>
        )}
      </div>
    </div>
  );
}
