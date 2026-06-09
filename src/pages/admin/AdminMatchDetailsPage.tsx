import { PagePanel } from '../../components/common/PagePanel';
import { useMatch, useInnings, useMatchPlayers } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useBallEvents } from '../../hooks/useBallEvents';
import { calculateInningsState, type ScoringContext } from '../../domain/scoring/scoringEngine';
import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
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
        <p className="text-slate-500 font-medium animate-pulse">Loading match details...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-700">
        <p className="font-semibold">Match Not Found</p>
      </div>
    );
  }

  if (match.status !== 'completed') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/admin')}
          className="text-sm text-slate-600 hover:text-slate-800 font-medium mb-4"
        >
          ← Back to Admin
        </button>
        <PagePanel title="Match Details">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-800">{match.match_name}</h2>
            <p className="text-sm text-slate-600">{match.match_date} • {match.venue || 'No Venue'}</p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-semibold">
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
        className="text-sm text-slate-600 hover:text-slate-800 font-medium"
      >
        ← Back to Admin
      </button>

      {/* Match Information Panel */}
      <PagePanel title="Match Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Match Name</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{match.match_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Date</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{match.match_date}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Venue</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{match.venue || 'Not specified'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold">Format</p>
            <p className="text-lg font-bold text-slate-800 mt-1">{match.overs_per_innings} overs • {match.players_per_team} a side</p>
          </div>
        </div>
      </PagePanel>

      {/* Result Panel */}
      <PagePanel title="Result">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Result</p>
            <p className="text-xl font-bold text-emerald-700 mt-2">{match.result_text || 'No result'}</p>
          </div>
          <div className="rounded-lg bg-slate-100 border border-slate-200 p-4">
            <p className="text-xs text-slate-500 uppercase font-bold">Toss</p>
            <p className="text-lg font-bold text-slate-800 mt-2">
              {match.toss_winner === 'team_a' ? match.team_a_name : match.team_b_name} won • {match.toss_decision === 'bat' ? 'Chose to bat' : 'Chose to bowl'}
            </p>
          </div>
        </div>
      </PagePanel>

      {/* Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Innings 1 Scorecard */}
        {innings1Stats && (
          <PagePanel title={`${innings1?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} Batting`}>
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Runs</p>
                  <p className="text-2xl font-bold text-teal-600">{innings1Stats.totalRuns}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Wickets</p>
                  <p className="text-2xl font-bold text-red-600">{innings1Stats.wickets}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Overs</p>
                  <p className="text-2xl font-bold text-slate-600">{innings1Stats.oversDisplay}</p>
                </div>
              </div>

              {/* Batting Table */}
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[1fr_2rem_2rem_1rem_1rem_2rem] gap-2 font-bold text-xs text-slate-600 uppercase pb-2 border-b">
                  <div>Batter</div>
                  <div className="text-right">R</div>
                  <div className="text-right">B</div>
                  <div className="text-right">4</div>
                  <div className="text-right">6</div>
                  <div className="text-right">SR</div>
                </div>
                {Object.entries(innings1Stats.battingStats).map(([playerId, stats]) => (
                  <div key={playerId} className="grid grid-cols-[1fr_2rem_2rem_1rem_1rem_2rem] gap-2 py-1 border-b">
                    <div className={stats.isOut ? 'text-slate-500 line-through' : 'font-semibold'}>
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
            </div>
          </PagePanel>
        )}

        {/* Innings 2 Scorecard */}
        {innings2Stats && (
          <PagePanel title={`${innings2?.batting_team === 'team_a' ? match.team_a_name : match.team_b_name} Batting`}>
            <div className="space-y-3">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Runs</p>
                  <p className="text-2xl font-bold text-teal-600">{innings2Stats.totalRuns}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Wickets</p>
                  <p className="text-2xl font-bold text-red-600">{innings2Stats.wickets}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Overs</p>
                  <p className="text-2xl font-bold text-slate-600">{innings2Stats.oversDisplay}</p>
                </div>
              </div>

              {/* Batting Table */}
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-[1fr_2rem_2rem_1rem_1rem_2rem] gap-2 font-bold text-xs text-slate-600 uppercase pb-2 border-b">
                  <div>Batter</div>
                  <div className="text-right">R</div>
                  <div className="text-right">B</div>
                  <div className="text-right">4</div>
                  <div className="text-right">6</div>
                  <div className="text-right">SR</div>
                </div>
                {Object.entries(innings2Stats.battingStats).map(([playerId, stats]) => (
                  <div key={playerId} className="grid grid-cols-[1fr_2rem_2rem_1rem_1rem_2rem] gap-2 py-1 border-b">
                    <div className={stats.isOut ? 'text-slate-500 line-through' : 'font-semibold'}>
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
              <div className="grid grid-cols-[2fr_1rem_1.5rem_1.5rem_1rem_1.5rem] gap-2 font-bold text-xs text-slate-600 uppercase pb-2 border-b">
                <div>Bowler</div>
                <div className="text-right">O</div>
                <div className="text-right">M</div>
                <div className="text-right">R</div>
                <div className="text-right">W</div>
                <div className="text-right">Eco</div>
              </div>
              {Object.entries(innings1Stats.bowlingStats).map(([playerId, stats]) => (
                <div key={playerId} className="grid grid-cols-[2fr_1rem_1.5rem_1.5rem_1rem_1.5rem] gap-2 py-1 border-b">
                  <div className="font-semibold truncate">{playerMap.get(playerId)}</div>
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
              <div className="grid grid-cols-[2fr_1rem_1.5rem_1.5rem_1rem_1.5rem] gap-2 font-bold text-xs text-slate-600 uppercase pb-2 border-b">
                <div>Bowler</div>
                <div className="text-right">O</div>
                <div className="text-right">M</div>
                <div className="text-right">R</div>
                <div className="text-right">W</div>
                <div className="text-right">Eco</div>
              </div>
              {Object.entries(innings2Stats.bowlingStats).map(([playerId, stats]) => (
                <div key={playerId} className="grid grid-cols-[2fr_1rem_1.5rem_1.5rem_1rem_1.5rem] gap-2 py-1 border-b">
                  <div className="font-semibold truncate">{playerMap.get(playerId)}</div>
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
