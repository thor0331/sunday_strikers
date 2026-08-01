import type { Availability, BallEvent, Match, MatchPlayer } from '../types/models';

export type TeamSide = 'team_a' | 'team_b';

export interface TeamStrengthCategory {
  score: number;
  detail: string;
}

export interface TeamStrength {
  name: string;
  side: TeamSide;
  matches: number;
  batting: TeamStrengthCategory;
  bowling: TeamStrengthCategory;
  fielding: TeamStrengthCategory;
  availability: TeamStrengthCategory;
  recentForm: TeamStrengthCategory;
  overall: number;
}

export interface TeamStrengthInput {
  teamAName: string;
  teamBName: string;
  /** Completed (non super-over) parent matches. */
  matches: Match[];
  /** Ball events across the completed matches. */
  ballEvents: BallEvent[];
  /** Match-player rows across the completed matches. */
  matchPlayers: MatchPlayer[];
  /** Squad rows for the current match (used for availability). */
  currentMatchPlayers: MatchPlayer[];
  /** Availability rows (filtered to currentMatchId inside). */
  availability: Availability[];
  currentMatchId: string;
  playersPerTeam: number;
}

interface TeamAggregate {
  teamName: string;
  side: TeamSide;
  matches: number;
  wins: number;
  battingRuns: number;
  battingBalls: number;
  battingInnings: number;
  concededRuns: number;
  ballsBowled: number;
  wickets: number;
  catches: number;
  runOuts: number;
  stumpings: number;
}

function sideFor(m: Match, teamName: string): TeamSide | null {
  if (m.team_a_name === teamName) return 'team_a';
  if (m.team_b_name === teamName) return 'team_b';
  return null;
}

function buildPlayerSets(matchPlayers: MatchPlayer[]): Map<string, { team_a: Set<string>; team_b: Set<string> }> {
  const map = new Map<string, { team_a: Set<string>; team_b: Set<string> }>();
  for (const mp of matchPlayers) {
    const entry = map.get(mp.match_id) ?? { team_a: new Set<string>(), team_b: new Set<string>() };
    entry[mp.team].add(mp.player_id);
    map.set(mp.match_id, entry);
  }
  return map;
}

function buildAggregate(
  teamName: string,
  side: TeamSide,
  matches: Match[],
  ballEvents: BallEvent[],
  playerSets: Map<string, { team_a: Set<string>; team_b: Set<string> }>
): TeamAggregate {
  const agg: TeamAggregate = {
    teamName,
    side,
    matches: 0,
    wins: 0,
    battingRuns: 0,
    battingBalls: 0,
    battingInnings: 0,
    concededRuns: 0,
    ballsBowled: 0,
    wickets: 0,
    catches: 0,
    runOuts: 0,
    stumpings: 0,
  };

  const oppSide: TeamSide = side === 'team_a' ? 'team_b' : 'team_a';

  for (const m of matches) {
    const matchSide = sideFor(m, teamName);
    if (matchSide !== side) continue;
    agg.matches += 1;
    if (m.winner === side) agg.wins += 1;

    const players = playerSets.get(m.id);
    if (!players) continue;
    const teamPlayers = players[side];
    const oppPlayers = players[oppSide];

    let battedInInnings = false;

    for (const e of ballEvents) {
      if (e.matchId !== m.id) continue;
      if (teamPlayers.has(e.strikerId)) {
        agg.battingRuns += e.runsBatter;
        if (e.isLegalDelivery) agg.battingBalls += 1;
        battedInInnings = true;
      }
      if (oppPlayers.has(e.bowlerId)) {
        agg.concededRuns += e.runsBatter + e.runsExtra;
        if (e.isLegalDelivery) agg.ballsBowled += 1;
        if (e.isWicket) agg.wickets += 1;
      }
      if (e.isWicket && e.fielderId && teamPlayers.has(e.fielderId)) {
        if (e.wicketType === 'stumped') agg.stumpings += 1;
        else if (e.wicketType === 'run_out') agg.runOuts += 1;
        else agg.catches += 1;
      }
    }

    if (battedInInnings) agg.battingInnings += 1;
  }

  return agg;
}

/** Relative "share" score: 50 when equal, higher for the larger value. */
function share(a: number, b: number): number {
  if (a + b <= 0) return 50;
  return (100 * a) / (a + b);
}

function clamp(score: number, min = 5, max = 95): number {
  return Math.round(Math.min(Math.max(score, min), max));
}

function economy(agg: TeamAggregate): number | null {
  if (agg.ballsBowled <= 0) return null;
  return (agg.concededRuns * 6) / agg.ballsBowled;
}

function buildStrength(
  agg: TeamAggregate,
  other: TeamAggregate,
  availabilityScore: number
): TeamStrength {
  const avgRunsA = agg.battingInnings > 0 ? agg.battingRuns / agg.battingInnings : 0;
  const avgRunsB = other.battingInnings > 0 ? other.battingRuns / other.battingInnings : 0;
  const batting = clamp(share(avgRunsA, avgRunsB));

  const econA = economy(agg);
  const econB = economy(other);
  let econShare: number;
  if (econA === null && econB === null) econShare = 50;
  else if (econA === null) econShare = 10;
  else if (econB === null) econShare = 90;
  else econShare = share(econB, econA);

  const wpiA = agg.wickets / Math.max(agg.matches, 1);
  const wpiB = other.wickets / Math.max(other.matches, 1);
  const wktShare = share(wpiA, wpiB);
  const bowling = clamp(0.65 * econShare + 0.35 * wktShare);

  const pointsA = agg.catches + agg.runOuts * 1.5 + agg.stumpings * 1.5;
  const pointsB = other.catches + other.runOuts * 1.5 + other.stumpings * 1.5;
  const fielding = clamp(share(pointsA, pointsB));

  const winPctA = agg.matches > 0 ? (agg.wins / agg.matches) * 100 : 0;
  const winPctB = other.matches > 0 ? (other.wins / other.matches) * 100 : 0;
  const recentForm = clamp(share(winPctA, winPctB));

  const overall = Math.round(
    0.25 * batting + 0.25 * bowling + 0.15 * fielding + 0.15 * availabilityScore + 0.2 * recentForm
  );

  return {
    name: agg.teamName,
    side: agg.side,
    matches: agg.matches,
    batting: { score: batting, detail: `${avgRunsA.toFixed(1)} runs/inn` },
    bowling: {
      score: bowling,
      detail: `${econA === null ? '-' : econA.toFixed(1)} econ • ${agg.wickets} wkts`,
    },
    fielding: { score: fielding, detail: `${agg.catches} catches • ${agg.runOuts} run-outs` },
    availability: { score: availabilityScore, detail: '' },
    recentForm: { score: recentForm, detail: `${agg.wins}/${agg.matches} wins` },
    overall,
  };
}

function availabilityScoreFor(
  side: TeamSide,
  currentMatchPlayers: MatchPlayer[],
  availability: Availability[],
  currentMatchId: string,
  playersPerTeam: number
): number {
  const squad = currentMatchPlayers.filter((mp) => mp.team === side);
  const squadSize = squad.length || playersPerTeam;
  const playerIds = new Set(squad.map((mp) => mp.player_id));
  const rows = availability.filter((a) => a.match_id === currentMatchId && playerIds.has(a.player_id));
  if (rows.length === 0) return 50;
  const available = rows.filter((a) => a.status === 'available').length;
  return Math.round((available / squadSize) * 100);
}

/**
 * Pure UI aggregation for the "Team Strength" meter. Consumes only already
 * computed/aggregated statistics (win/loss rows, ball events, squads,
 * availability) and never re-derives scores.
 */
export function computeTeamStrengths(input: TeamStrengthInput): { teamA: TeamStrength; teamB: TeamStrength } {
  const { teamAName, teamBName, matches, ballEvents, matchPlayers, currentMatchPlayers, availability, currentMatchId } = input;
  const playerSets = buildPlayerSets(matchPlayers);
  const aggA = buildAggregate(teamAName, 'team_a', matches, ballEvents, playerSets);
  const aggB = buildAggregate(teamBName, 'team_b', matches, ballEvents, playerSets);

  const availA = availabilityScoreFor('team_a', currentMatchPlayers, availability, currentMatchId, input.playersPerTeam);
  const availB = availabilityScoreFor('team_b', currentMatchPlayers, availability, currentMatchId, input.playersPerTeam);

  const teamA = buildStrength(aggA, aggB, availA);
  const teamB = buildStrength(aggB, aggA, availB);

  return { teamA, teamB };
}
