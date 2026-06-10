import { PagePanel } from '../../components/common/PagePanel';
import { useMatch, useInnings, useMatchPlayers } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useParentMatches } from '../../hooks/useMatches';
import { Award, Calendar, MapPin, Trophy, ChevronLeft, Star, Swords, Share2 } from 'lucide-react';
import type { BallEvent } from '../../types/models';
import { MatchHeroes } from '../../components/common/MatchHeroes';
import { MomentumGraph } from '../../components/common/MomentumGraph';
import { MatchTimeline } from '../../components/common/MatchTimeline';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { shareMatchResult } from '../../services/shareService';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { computeHeadToHead } from '../../utils/analytics';

export function AdminMatchDetailsPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading: matchLoading } = useMatch(matchId);
  const { data: inningsList = [] } = useInnings(matchId);
  const { data: matchPlayers = [] } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();

  const avatarViewer = useAvatarViewerStore();
  const { data: allMatches = [] } = useParentMatches();
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

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          <p className="text-slate-500 font-medium">Loading match details...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-700 max-w-lg mx-auto mt-8 text-center">
        <p className="font-semibold text-lg">Match Not Found</p>
      </div>
    );
  }

  if (match.status !== 'completed') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Admin
        </button>
        <PagePanel title="Match Details">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">{match.match_name}</h2>
            <p className="text-sm text-slate-500">{match.match_date} • {match.venue || 'No Venue'}</p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-semibold">
              This match has not been completed yet.
            </div>
          </div>
        </PagePanel>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/admin')}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Admin
      </button>

      {/* Match Information Panel */}
      <PagePanel title="Match Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Match</p>
            <p className="text-lg font-bold text-slate-800">{match.match_name}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Date</p>
            <p className="text-lg font-bold text-slate-800 inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />{match.match_date}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Venue</p>
            <p className="text-lg font-bold text-slate-800 inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" />{match.venue || 'Not specified'}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Format</p>
            <p className="text-lg font-bold text-slate-800">{match.overs_per_innings} overs • {match.players_per_team} a side</p>
          </div>
        </div>
      </PagePanel>

      {/* Match Timeline */}
      {match.status === 'completed' && (
        <MatchTimeline
          matchStatus={match.status}
          innings1Status={innings1?.status}
          innings2Status={innings2?.status}
          resultText={match.result_text}
        />
      )}

      {/* Result Banner */}
      <div className={`rounded-xl border p-5 flex items-center gap-4 ${match.winner ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200'}`}>
        <Trophy className={`w-8 h-8 ${match.winner ? 'text-teal-600' : 'text-amber-600'}`} />
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Result</p>
          <p className={`text-xl font-bold mt-0.5 ${match.winner ? 'text-teal-700' : 'text-amber-700'}`}>
            {match.result_text || 'No result'}
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Toss</p>
          <p className="text-sm font-semibold text-slate-600 mt-0.5">
            <Swords className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
            {match.toss_winner === 'team_a' ? match.team_a_name : match.team_b_name} won • {match.toss_decision === 'bat' ? 'Chose to bat' : 'Chose to bowl'}
          </p>
        </div>
      </div>

      {/* POTM Card */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50/50 to-white p-5 flex items-center gap-4">
        <CircularAvatar
          src={match.player_of_match_id ? playerPhotoMap.get(match.player_of_match_id) ?? null : null}
          alt={match.player_of_match_id ? playerMap.get(match.player_of_match_id) ?? 'POTM' : 'POTM'}
          size="lg"
          onClick={() => {
            if (match.player_of_match_id) {
              const url = playerPhotoMap.get(match.player_of_match_id);
              const name = playerMap.get(match.player_of_match_id);
              if (url) avatarViewer.open(url, name ?? 'POTM');
            }
          }}
        />
        <div>
          <p className="text-xs text-amber-600/70 uppercase font-bold tracking-wider">Player of the Match</p>
          <p className="text-xl font-bold text-amber-800 mt-0.5">
            {match.player_of_match_id
              ? playerMap.get(match.player_of_match_id) ?? 'Unknown Player'
              : 'Not Selected'}
          </p>
        </div>
        <Star className="w-5 h-5 text-amber-300 ml-auto" />
      </div>

      {/* Match Heroes */}
      <PagePanel title="Match Heroes">
        <MatchHeroes
          match={match}
          innings1Stats={innings1Stats}
          innings2Stats={innings2Stats}
          playerMap={playerMap}
          playerPhotoMap={playerPhotoMap}
        />
        <div className="mt-3">
          <button
            onClick={() => {
              const s1 = innings1Stats ? `${innings1Stats.totalRuns}/${innings1Stats.wickets} (${innings1Stats.oversDisplay} ov)` : '-';
              const s2 = innings2Stats ? `${innings2Stats.totalRuns}/${innings2Stats.wickets} (${innings2Stats.oversDisplay} ov)` : '-';
              const potm = match.player_of_match_id ? playerMap.get(match.player_of_match_id) ?? null : null;
              void shareMatchResult(match, s1, s2, potm);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors border border-teal-200"
          >
            <Share2 className="w-4 h-4" /> Share Result
          </button>
        </div>
      </PagePanel>

      {/* Head to Head */}
      <PagePanel title="Head to Head">
        {(() => {
          const h2h = computeHeadToHead(allMatches, match.team_a_name, match.team_b_name);
          if (h2h.matchesPlayed === 0) return <p className="text-sm text-slate-400 text-center py-2">No prior meetings.</p>;
          return (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2">
                  <p className="text-2xl font-extrabold text-teal-600">{h2h.teamAWins}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold truncate">{match.team_a_name}</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl font-extrabold text-slate-700">{h2h.matchesPlayed}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Matches</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl font-extrabold text-blue-600">{h2h.teamBWins}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold truncate">{match.team_b_name}</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-500" style={{ width: `${h2h.teamAWinPercentage}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{h2h.teamAWinPercentage}%</span>
                <span>{h2h.teamBWinPercentage}%</span>
              </div>
            </div>
          );
        })()}
      </PagePanel>

      {/* Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Innings 1 Scorecard */}
        {innings1Stats && (
          <PagePanel title={`${innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} Batting`}>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center rounded-lg bg-teal-50 border border-teal-200 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Runs</p>
                  <p className="text-2xl font-bold text-teal-600 mt-1">{innings1Stats.totalRuns}</p>
                </div>
                <div className="text-center rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Wickets</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{innings1Stats.wickets}</p>
                </div>
                <div className="text-center rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Overs</p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">{innings1Stats.oversDisplay}</p>
                </div>
              </div>

              {/* Batting Table */}
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase font-bold tracking-wider">
                      <th className="text-left pb-2 pl-1">Batter</th>
                      <th className="text-right pb-2">R</th>
                      <th className="text-right pb-2">B</th>
                      <th className="text-right pb-2">4s</th>
                      <th className="text-right pb-2">6s</th>
                      <th className="text-right pb-2 pr-1">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(innings1Stats.battingStats).map(([playerId, stats], idx) => (
                      <tr key={playerId} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                        <td className="py-2 pl-1">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={stats.isOut ? 'text-slate-500' : 'font-semibold text-slate-800'}>
                              {playerMap.get(playerId)}
                            </span>
                            {stats.isOut ? (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">b</span>
                            ) : (
                              <span className="text-[10px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded">not out</span>
                            )}
                          </span>
                        </td>
                        <td className="text-right py-2 font-bold text-slate-800">{stats.runs}</td>
                        <td className="text-right py-2 text-slate-500">{stats.balls}</td>
                        <td className="text-right py-2 text-slate-500">{stats.fours}</td>
                        <td className="text-right py-2 text-slate-500">{stats.sixes}</td>
                        <td className="text-right py-2 pr-1 text-slate-500">{stats.strikeRate.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <MomentumGraph
                ballEvents={ballEvents1}
                oversPerInnings={match.overs_per_innings}
                battingTeamName={innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}
              />
            </div>
          </PagePanel>
        )}

        {/* Innings 2 Scorecard */}
        {innings2Stats && (
          <PagePanel title={`${innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} Batting`}>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center rounded-lg bg-teal-50 border border-teal-200 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Runs</p>
                  <p className="text-2xl font-bold text-teal-600 mt-1">{innings2Stats.totalRuns}</p>
                </div>
                <div className="text-center rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Wickets</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{innings2Stats.wickets}</p>
                </div>
                <div className="text-center rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Overs</p>
                  <p className="text-2xl font-bold text-slate-700 mt-1">{innings2Stats.oversDisplay}</p>
                </div>
              </div>

              {/* Batting Table */}
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase font-bold tracking-wider">
                      <th className="text-left pb-2 pl-1">Batter</th>
                      <th className="text-right pb-2">R</th>
                      <th className="text-right pb-2">B</th>
                      <th className="text-right pb-2">4s</th>
                      <th className="text-right pb-2">6s</th>
                      <th className="text-right pb-2 pr-1">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(innings2Stats.battingStats).map(([playerId, stats], idx) => (
                      <tr key={playerId} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                        <td className="py-2 pl-1">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={stats.isOut ? 'text-slate-500' : 'font-semibold text-slate-800'}>
                              {playerMap.get(playerId)}
                            </span>
                            {stats.isOut ? (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">b</span>
                            ) : (
                              <span className="text-[10px] font-bold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded">not out</span>
                            )}
                          </span>
                        </td>
                        <td className="text-right py-2 font-bold text-slate-800">{stats.runs}</td>
                        <td className="text-right py-2 text-slate-500">{stats.balls}</td>
                        <td className="text-right py-2 text-slate-500">{stats.fours}</td>
                        <td className="text-right py-2 text-slate-500">{stats.sixes}</td>
                        <td className="text-right py-2 pr-1 text-slate-500">{stats.strikeRate.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <MomentumGraph
                ballEvents={ballEvents2}
                oversPerInnings={match.overs_per_innings}
                battingTeamName={innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name}
              />
            </div>
          </PagePanel>
        )}
      </div>

      {/* Bowling Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Innings 1 Bowling */}
        {innings1Stats && (
          <PagePanel title={`${innings1?.bowling_team === 'team_a' ? match.team_a_name : match.team_b_name} Bowling`}>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase font-bold tracking-wider">
                    <th className="text-left pb-2 pl-1">Bowler</th>
                    <th className="text-right pb-2">O</th>
                    <th className="text-right pb-2">M</th>
                    <th className="text-right pb-2">R</th>
                    <th className="text-right pb-2">W</th>
                    <th className="text-right pb-2 pr-1">Eco</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(innings1Stats.bowlingStats).map(([playerId, stats], idx) => (
                    <tr key={playerId} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="py-2 pl-1 font-semibold text-slate-700 truncate max-w-[140px]">{playerMap.get(playerId)}</td>
                      <td className="text-right py-2 text-slate-500">{stats.oversDisplay}</td>
                      <td className="text-right py-2 text-slate-500">{stats.maidens}</td>
                      <td className="text-right py-2 text-slate-500">{stats.runsConceded}</td>
                      <td className="text-right py-2 font-bold text-slate-800">{stats.wickets}</td>
                      <td className="text-right py-2 pr-1 text-slate-500">{stats.economy.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PagePanel>
        )}

        {/* Innings 2 Bowling */}
        {innings2Stats && (
          <PagePanel title={`${innings2?.bowling_team === 'team_a' ? match.team_a_name : match.team_b_name} Bowling`}>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase font-bold tracking-wider">
                    <th className="text-left pb-2 pl-1">Bowler</th>
                    <th className="text-right pb-2">O</th>
                    <th className="text-right pb-2">M</th>
                    <th className="text-right pb-2">R</th>
                    <th className="text-right pb-2">W</th>
                    <th className="text-right pb-2 pr-1">Eco</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(innings2Stats.bowlingStats).map(([playerId, stats], idx) => (
                    <tr key={playerId} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                      <td className="py-2 pl-1 font-semibold text-slate-700 truncate max-w-[140px]">{playerMap.get(playerId)}</td>
                      <td className="text-right py-2 text-slate-500">{stats.oversDisplay}</td>
                      <td className="text-right py-2 text-slate-500">{stats.maidens}</td>
                      <td className="text-right py-2 text-slate-500">{stats.runsConceded}</td>
                      <td className="text-right py-2 font-bold text-slate-800">{stats.wickets}</td>
                      <td className="text-right py-2 pr-1 text-slate-500">{stats.economy.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PagePanel>
        )}
      </div>
    </div>
  );
}
