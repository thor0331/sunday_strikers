import { PagePanel } from '../../components/common/PagePanel';
import { useMatch, useInnings, useMatchPlayers } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';

export function MatchSummaryPage() {
  const { matchId = '' } = useParams();
  const { data: match, isLoading: matchLoading, error: matchError } = useMatch(matchId);
  const { data: inningsList = [], isLoading: inningsLoading } = useInnings(matchId);
  const { data: matchPlayers = [], isLoading: playersLoading } = useMatchPlayers(matchId);
  const { data: players = [] } = usePlayers();

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p.display_name])), [players]);

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
    const strikerIndex = batting.findIndex((mp) => mp.is_captain);
    const striker = strikerIndex >= 0 ? batting[strikerIndex].player_id : batting[0]?.player_id;
    const nonStrikerIndex = strikerIndex >= 0 ? (strikerIndex + 1) % batting.length : 1;
    const nonStriker = batting[nonStrikerIndex]?.player_id;

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
    const strikerIndex = batting.findIndex((mp) => mp.is_captain);
    const striker = strikerIndex >= 0 ? batting[strikerIndex].player_id : batting[0]?.player_id;
    const nonStrikerIndex = strikerIndex >= 0 ? (strikerIndex + 1) % batting.length : 1;
    const nonStriker = batting[nonStrikerIndex]?.player_id;

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

  const isLoading = matchLoading || inningsLoading || playersLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500 font-medium animate-pulse">Loading match summary...</p>
      </div>
    );
  }

  if (matchError || !match) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-700">
        <p className="font-semibold">Error</p>
        <p className="text-sm">Unable to load match summary.</p>
      </div>
    );
  }

  if (match.status !== 'completed') {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PagePanel title="Match Details">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-800">{match.match_name}</h2>
            <p className="text-sm text-slate-600">{match.match_date} • {match.venue || 'No Venue'}</p>
            <p className="text-slate-700">
              <span className="font-semibold">{match.team_a_name}</span> vs <span className="font-semibold">{match.team_b_name}</span>
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-semibold">
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
            <h2 className="text-2xl font-bold text-slate-800">{match.match_name}</h2>
            <p className="text-sm text-slate-500">{match.match_date} • {match.venue || 'No Venue'}</p>
          </div>

          {/* Result Banner */}
          {match.result_text && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-lg font-bold text-emerald-900">{match.result_text}</p>
            </div>
          )}

          {/* Team Scores */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Innings 1 */}
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-700 mb-2">{innings1 ? (innings1.batting_team === 'team_a' ? match.team_a_name : match.team_b_name) : 'Team'}</h3>
              {innings1Stats ? (
                <div>
                  <div className="text-3xl font-bold text-teal-600">
                    {innings1Stats.totalRuns}/{innings1Stats.wickets}
              </div>
                  <p className="text-xs text-slate-500 mt-1">{innings1Stats.oversDisplay} overs</p>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">-</p>
              )}
            </div>

            {/* Innings 2 */}
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-700 mb-2">{innings2 ? (innings2.batting_team === 'team_a' ? match.team_a_name : match.team_b_name) : 'Team'}</h3>
              {innings2Stats ? (
                <div>
                  <div className="text-3xl font-bold text-teal-600">
                    {innings2Stats.totalRuns}/{innings2Stats.wickets}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{innings2Stats.oversDisplay} overs</p>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">-</p>
              )}
            </div>
          </div>
        </div>
      </PagePanel>

      {/* Player of the Match Stats */}
      <PagePanel title="Key Performances">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Batter */}
          {topBatter && (
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Top Batter</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{playerMap.get(topBatter.playerId) ?? 'Player'}</p>
              <p className="text-sm text-slate-600 mt-1">{topBatter.runs} runs ({topBatter.balls}b)</p>
            </div>
          )}

          {/* Top Bowler */}
          {topBowler && (
            <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Top Bowler</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{playerMap.get(topBowler.playerId) ?? 'Player'}</p>
              <p className="text-sm text-slate-600 mt-1">{topBowler.wickets} wickets ({topBowler.oversDisplay} ov)</p>
            </div>
          )}

          {/* Match Info */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Match Type</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{match.overs_per_innings} Overs</p>
            <p className="text-sm text-slate-600 mt-1">{match.players_per_team} a side</p>
          </div>
        </div>
      </PagePanel>

      {/* Innings Summary Panels */}
      {innings1Stats && (
        <PagePanel title={`${innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} - 1st Innings`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-600 font-semibold">Runs</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">{innings1Stats.totalRuns}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-600 font-semibold">Wickets</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{innings1Stats.wickets}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-600 font-semibold">Overs</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{innings1Stats.oversDisplay}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-600 font-semibold">Run Rate</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{innings1Stats.currentRunRate}</p>
            </div>
          </div>
        </PagePanel>
      )}

      {innings2Stats && (
        <PagePanel title={`${innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} - 2nd Innings`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-600 font-semibold">Runs</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">{innings2Stats.totalRuns}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-600 font-semibold">Wickets</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{innings2Stats.wickets}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-600 font-semibold">Overs</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{innings2Stats.oversDisplay}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-600 font-semibold">Run Rate</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{innings2Stats.currentRunRate}</p>
            </div>
          </div>
        </PagePanel>
      )}
    </div>
  );
}
