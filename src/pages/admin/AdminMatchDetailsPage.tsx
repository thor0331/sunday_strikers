import { PagePanel } from '../../components/common/PagePanel';
import { useMatch, useInnings, useMatchPlayers } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { Award, Calendar, MapPin, Trophy, ChevronLeft, Star, Swords } from 'lucide-react';
import type { BallEvent } from '../../types/models';

export function AdminMatchDetailsPage() {
  const { matchId = '' } = useParams();
  const navigate = useNavigate();
  const { data: match, isLoading: matchLoading } = useMatch(matchId);
  const { data: inningsList = [] } = useInnings(matchId);
  const { data: matchPlayers = [] } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);

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
      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 max-w-lg mx-auto mt-8 text-center">
        <p className="font-semibold text-lg">Match Not Found</p>
      </div>
    );
  }

  if (match.status !== 'completed') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 font-medium mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Admin
        </button>
        <PagePanel title="Match Details">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-100">{match.match_name}</h2>
            <p className="text-sm text-slate-400">{match.match_date} • {match.venue || 'No Venue'}</p>
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm font-semibold">
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
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 font-medium transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Admin
      </button>

      {/* Match Information Panel */}
      <PagePanel title="Match Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Match</p>
            <p className="text-lg font-bold text-slate-100">{match.match_name}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Date</p>
            <p className="text-lg font-bold text-slate-100 inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />{match.match_date}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Venue</p>
            <p className="text-lg font-bold text-slate-100 inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-500" />{match.venue || 'Not specified'}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Format</p>
            <p className="text-lg font-bold text-slate-100">{match.overs_per_innings} overs • {match.players_per_team} a side</p>
          </div>
        </div>
      </PagePanel>

      {/* Result Banner */}
      <div className={`rounded-xl border p-5 flex items-center gap-4 ${match.winner ? 'bg-teal-500/10 border-teal-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
        <Trophy className={`w-8 h-8 ${match.winner ? 'text-teal-400' : 'text-amber-400'}`} />
        <div className="flex-1">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Result</p>
          <p className={`text-xl font-bold mt-0.5 ${match.winner ? 'text-teal-300' : 'text-amber-300'}`}>
            {match.result_text || 'No result'}
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Toss</p>
          <p className="text-sm font-semibold text-slate-300 mt-0.5">
            <Swords className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
            {match.toss_winner === 'team_a' ? match.team_a_name : match.team_b_name} won • {match.toss_decision === 'bat' ? 'Chose to bat' : 'Chose to bowl'}
          </p>
        </div>
      </div>

      {/* POTM Card */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5 p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
          <Award className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <p className="text-xs text-amber-400/70 uppercase font-bold tracking-wider">Player of the Match</p>
          <p className="text-xl font-bold text-amber-300 mt-0.5">
            {match.player_of_match_id
              ? playerMap.get(match.player_of_match_id) ?? 'Unknown Player'
              : 'Not Selected'}
          </p>
        </div>
        <Star className="w-5 h-5 text-amber-500/40 ml-auto" />
      </div>

      {/* Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Innings 1 Scorecard */}
        {innings1Stats && (
          <PagePanel title={`${innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} Batting`}>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center rounded-lg bg-teal-500/10 border border-teal-500/20 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Runs</p>
                  <p className="text-2xl font-bold text-teal-400 mt-1">{innings1Stats.totalRuns}</p>
                </div>
                <div className="text-center rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Wickets</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{innings1Stats.wickets}</p>
                </div>
                <div className="text-center rounded-lg bg-slate-500/10 border border-slate-500/20 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Overs</p>
                  <p className="text-2xl font-bold text-slate-300 mt-1">{innings1Stats.oversDisplay}</p>
                </div>
              </div>

              {/* Batting Table */}
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase font-bold tracking-wider">
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
                      <tr key={playerId} className={`border-b border-slate-700/30 transition-colors hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-700/10' : ''}`}>
                        <td className="py-2 pl-1">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={stats.isOut ? 'text-slate-400' : 'font-semibold text-slate-100'}>
                              {playerMap.get(playerId)}
                            </span>
                            {stats.isOut ? (
                              <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">b</span>
                            ) : (
                              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/15 px-1.5 py-0.5 rounded">not out</span>
                            )}
                          </span>
                        </td>
                        <td className="text-right py-2 font-bold text-slate-100">{stats.runs}</td>
                        <td className="text-right py-2 text-slate-400">{stats.balls}</td>
                        <td className="text-right py-2 text-slate-400">{stats.fours}</td>
                        <td className="text-right py-2 text-slate-400">{stats.sixes}</td>
                        <td className="text-right py-2 pr-1 text-slate-400">{stats.strikeRate.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PagePanel>
        )}

        {/* Innings 2 Scorecard */}
        {innings2Stats && (
          <PagePanel title={`${innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} Batting`}>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center rounded-lg bg-teal-500/10 border border-teal-500/20 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Runs</p>
                  <p className="text-2xl font-bold text-teal-400 mt-1">{innings2Stats.totalRuns}</p>
                </div>
                <div className="text-center rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Wickets</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">{innings2Stats.wickets}</p>
                </div>
                <div className="text-center rounded-lg bg-slate-500/10 border border-slate-500/20 p-3">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Overs</p>
                  <p className="text-2xl font-bold text-slate-300 mt-1">{innings2Stats.oversDisplay}</p>
                </div>
              </div>

              {/* Batting Table */}
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase font-bold tracking-wider">
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
                      <tr key={playerId} className={`border-b border-slate-700/30 transition-colors hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-700/10' : ''}`}>
                        <td className="py-2 pl-1">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={stats.isOut ? 'text-slate-400' : 'font-semibold text-slate-100'}>
                              {playerMap.get(playerId)}
                            </span>
                            {stats.isOut ? (
                              <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded">b</span>
                            ) : (
                              <span className="text-[10px] font-bold text-teal-400 bg-teal-500/15 px-1.5 py-0.5 rounded">not out</span>
                            )}
                          </span>
                        </td>
                        <td className="text-right py-2 font-bold text-slate-100">{stats.runs}</td>
                        <td className="text-right py-2 text-slate-400">{stats.balls}</td>
                        <td className="text-right py-2 text-slate-400">{stats.fours}</td>
                        <td className="text-right py-2 text-slate-400">{stats.sixes}</td>
                        <td className="text-right py-2 pr-1 text-slate-400">{stats.strikeRate.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase font-bold tracking-wider">
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
                    <tr key={playerId} className={`border-b border-slate-700/30 transition-colors hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-700/10' : ''}`}>
                      <td className="py-2 pl-1 font-semibold text-slate-300 truncate max-w-[140px]">{playerMap.get(playerId)}</td>
                      <td className="text-right py-2 text-slate-400">{stats.oversDisplay}</td>
                      <td className="text-right py-2 text-slate-400">{stats.maidens}</td>
                      <td className="text-right py-2 text-slate-400">{stats.runsConceded}</td>
                      <td className="text-right py-2 font-bold text-slate-100">{stats.wickets}</td>
                      <td className="text-right py-2 pr-1 text-slate-400">{stats.economy.toFixed(1)}</td>
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
                  <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase font-bold tracking-wider">
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
                    <tr key={playerId} className={`border-b border-slate-700/30 transition-colors hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-700/10' : ''}`}>
                      <td className="py-2 pl-1 font-semibold text-slate-300 truncate max-w-[140px]">{playerMap.get(playerId)}</td>
                      <td className="text-right py-2 text-slate-400">{stats.oversDisplay}</td>
                      <td className="text-right py-2 text-slate-400">{stats.maidens}</td>
                      <td className="text-right py-2 text-slate-400">{stats.runsConceded}</td>
                      <td className="text-right py-2 font-bold text-slate-100">{stats.wickets}</td>
                      <td className="text-right py-2 pr-1 text-slate-400">{stats.economy.toFixed(1)}</td>
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
