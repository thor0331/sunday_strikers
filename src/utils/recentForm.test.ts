import { describe, expect, it } from 'vitest';
import type { Match } from '../types/models';
import { battingRating, computeRecentForm } from './recentForm';

let seq = 0;
function match(partial: Partial<Match>): Match {
  seq += 1;
  return {
    id: partial.id ?? `m-${seq}`,
    parent_match_id: null,
    season_id: null,
    match_name: partial.match_name ?? `Match ${seq}`,
    match_date: partial.match_date ?? `2026-06-0${seq % 9}`,
    match_number: null,
    venue: null,
    is_super_over: partial.is_super_over ?? false,
    overs_per_innings: 10,
    players_per_team: 11,
    status: partial.status ?? 'completed',
    team_a_name: 'Team A',
    team_b_name: 'Team B',
    team_a_captain_id: partial.team_a_captain_id ?? null,
    team_b_captain_id: partial.team_b_captain_id ?? null,
    toss_winner: null,
    toss_decision: null,
    batting_first: null,
    winner: null,
    player_of_match_id: partial.player_of_match_id ?? null,
    result_text: null,
    notes: null,
    match_format: null,
  };
}

function innings(runs: number, balls: number, isOut: boolean, matchName: string) {
  return { runs, balls, isOut, matchDate: '2026-06-08', matchName };
}

describe('battingRating', () => {
  it('rewards a fast half-century highly', () => {
    expect(battingRating(50, 30, false)).toBeGreaterThanOrEqual(90);
  });

  it('rewards a low score poorly', () => {
    expect(battingRating(4, 3, true)).toBeLessThan(40);
  });

  it('treats a duck out as the worst rating', () => {
    expect(battingRating(0, 1, true)).toBeLessThan(battingRating(0, 1, false));
    expect(battingRating(0, 1, true)).toBe(5);
  });

  it('caps at 100', () => {
    expect(battingRating(60, 20, false)).toBe(100);
  });
});

describe('computeRecentForm', () => {
  it('renders newest match first', () => {
    const m1 = match({ match_name: 'Old', match_date: '2026-05-01' });
    const m2 = match({ match_name: 'New', match_date: '2026-06-01' });
    const cells = computeRecentForm({
      playerId: 'p1',
      matches: [m1, m2],
      inningsHistory: [innings(20, 15, true, 'Old'), innings(30, 20, false, 'New')],
      potmMatchIds: new Set(),
    });
    expect(cells[0].matchName).toBe('New');
    expect(cells[0].rating).toBeGreaterThan(cells[1].rating);
  });

  it('marks matches the player did not take part in as not played', () => {
    const played = match({ match_name: 'Played', match_date: '2026-06-01' });
    const absent = match({ match_name: 'Absent', match_date: '2026-06-02', team_a_captain_id: 'someone-else' });
    const cells = computeRecentForm({
      playerId: 'p1',
      matches: [played, absent],
      inningsHistory: [innings(30, 20, false, 'Played')],
      potmMatchIds: new Set(),
    });
    const absentCell = cells.find((c) => c.matchName === 'Absent');
    expect(absentCell?.played).toBe(false);
    expect(absentCell?.runs).toBeNull();
    expect(absentCell?.rating).toBe(0);
  });

  it('flags player-of-the-match matches with a gold cell', () => {
    const m = match({ match_name: 'POTM', match_date: '2026-06-01', player_of_match_id: 'p1' });
    const cells = computeRecentForm({
      playerId: 'p1',
      matches: [m],
      inningsHistory: [innings(55, 35, false, 'POTM')],
      potmMatchIds: new Set([m.id]),
    });
    expect(cells[0].isPotm).toBe(true);
  });

  it('counts captaincy as taking part', () => {
    const m = match({ match_name: 'Captained', match_date: '2026-06-01', team_a_captain_id: 'p1' });
    const cells = computeRecentForm({
      playerId: 'p1',
      matches: [m],
      inningsHistory: [],
      potmMatchIds: new Set(),
    });
    expect(cells[0].played).toBe(true);
    expect(cells[0].runs).toBe(0);
  });

  it('respects the limit and skips super overs', () => {
    const regular = [...Array(11)].map((_, i) => match({ match_name: `M${i}`, match_date: `2026-06-${String(i + 1).padStart(2, '0')}` }));
    const superOver = match({ match_name: 'SO', match_date: '2026-06-12', is_super_over: true });
    const cells = computeRecentForm({
      playerId: 'p1',
      matches: [...regular, superOver],
      inningsHistory: [],
      potmMatchIds: new Set(),
      limit: 10,
    });
    expect(cells).toHaveLength(10);
    expect(cells.every((c) => c.matchId !== superOver.id)).toBe(true);
  });
});
