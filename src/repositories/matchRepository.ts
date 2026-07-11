import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import type { TeamSide } from '../types/models';
import { requireData, parseSupabaseError } from './supabaseErrors';

export type MatchInsert = Database['public']['Tables']['matches']['Insert'];
export type MatchUpdate = Database['public']['Tables']['matches']['Update'];
export type MatchPlayerInsert = Database['public']['Tables']['match_players']['Insert'];

export interface TeamAssignment {
  playerId: string;
  team: TeamSide;
  battingOrder: number;
  isCaptain: boolean;
}

export interface TossInput {
  tossWinner: TeamSide;
  decision: 'bat' | 'bowl';
}

function assertMatchName(input: Pick<MatchInsert, 'match_name'>) {
  if (!input.match_name.trim()) throw new Error('Match name is required.');
}

function battingFirstFromToss(input: TossInput): TeamSide {
  if (input.decision === 'bat') return input.tossWinner;
  return input.tossWinner === 'team_a' ? 'team_b' : 'team_a';
}

export const matchRepository = {
  async list() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: false })
      .order('match_number', { ascending: false, nullsFirst: false });

    return requireData(data, error);
  },

  async listParentMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('is_super_over', false)
      .order('match_date', { ascending: false })
      .order('match_number', { ascending: false, nullsFirst: false });

    return requireData(data, error);
  },

  async get(matchId: string) {
    const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single();
    return requireData(data, error);
  },

  async create(input: MatchInsert) {
    assertMatchName(input);
    if (input.overs_per_innings !== undefined && input.overs_per_innings < 1) throw new Error('Overs must be at least 1.');
    if (input.players_per_team !== undefined && input.players_per_team < 1) throw new Error('Players per team must be at least 1.');

    const { data, error } = await supabase.from('matches').insert(input).select().single();
    return requireData(data, error);
  },

  async update(matchId: string, input: MatchUpdate) {
    if (input.match_name !== undefined && !input.match_name.trim()) throw new Error('Match name is required.');
    const { data, error } = await supabase.from('matches').update(input).eq('id', matchId).select().single();
    return requireData(data, error);
  },

  async setCaptains(matchId: string, teamACaptainId: string, teamBCaptainId: string) {
    if (teamACaptainId === teamBCaptainId) throw new Error('Captains must be different players.');
    return this.update(matchId, {
      team_a_captain_id: teamACaptainId,
      team_b_captain_id: teamBCaptainId,
      status: 'scheduled'
    });
  },

  async saveTeams(matchId: string, assignments: TeamAssignment[]) {
    if (assignments.length === 0) throw new Error('Select at least one player.');
    const uniquePlayers = new Set(assignments.map((assignment) => assignment.playerId));
    if (uniquePlayers.size !== assignments.length) throw new Error('A player can only be assigned once.');

    const { error: deleteError } = await supabase.from('match_players').delete().eq('match_id', matchId);
    if (deleteError) throw parseSupabaseError(deleteError);

    const rows: MatchPlayerInsert[] = assignments.map((assignment) => ({
      match_id: matchId,
      player_id: assignment.playerId,
      team: assignment.team,
      batting_order: assignment.battingOrder ?? null,
      is_captain: assignment.isCaptain ?? false
    }));

    const { data, error } = await supabase.from('match_players').insert(rows).select();
    if (error) throw parseSupabaseError(error);

    await this.update(matchId, { status: 'teams_created' });
    return data;
  },

  draftTeams(playerIds: string[], teamACaptainId: string, teamBCaptainId: string): TeamAssignment[] {
    const pool = playerIds.filter((id) => id !== teamACaptainId && id !== teamBCaptainId);
    const assignments: TeamAssignment[] = [
      { playerId: teamACaptainId, team: 'team_a', battingOrder: 1, isCaptain: true },
      { playerId: teamBCaptainId, team: 'team_b', battingOrder: 1, isCaptain: true }
    ];

    pool.forEach((playerId, index) => {
      const team = index % 2 === 0 ? 'team_a' : 'team_b';
      const order = assignments.filter((assignment) => assignment.team === team).length + 1;
      assignments.push({ playerId, team, battingOrder: order, isCaptain: false });
    });

    return assignments;
  },

  async listCompletedMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'completed')
      .eq('is_super_over', false)
      .order('match_date', { ascending: false })
      .limit(5);
    return requireData(data, error);
  },

  async listPlayers(matchId: string) {
    const { data, error } = await supabase.from('match_players').select('*').eq('match_id', matchId).order('team').order('batting_order');
    return requireData(data, error);
  },

  async conductToss(matchId: string, input: TossInput) {
    const match = await this.get(matchId);
    const battingFirst = battingFirstFromToss(input);
    const bowlingFirst: TeamSide = battingFirst === 'team_a' ? 'team_b' : 'team_a';

    const updated = await this.update(matchId, {
      toss_winner: input.tossWinner,
      toss_decision: input.decision,
      batting_first: battingFirst,
      status: 'toss_completed'
    });

    const battingTeam: Database['public']['Enums']['innings_side'] = battingFirst;
    const bowlingTeam: Database['public']['Enums']['innings_side'] = bowlingFirst;

    const firstInnings = {
      match_id: matchId,
      innings_number: 1,
      batting_team: battingTeam,
      bowling_team: bowlingTeam,
      status: 'not_started' as const,
      target_runs: null
    };

    const secondInnings = {
      match_id: matchId,
      innings_number: 2,
      batting_team: bowlingTeam,
      bowling_team: battingTeam,
      status: 'not_started' as const,
      target_runs: null
    };

    const { error } = await supabase.from('innings').upsert([firstInnings, secondInnings], { onConflict: 'match_id,innings_number' });
    if (error) throw parseSupabaseError(error);

    return { ...updated, overs_per_innings: match.overs_per_innings };
  },

  async startSuperOver(parentMatchId: string, input: Omit<MatchInsert, 'parent_match_id' | 'is_super_over' | 'overs_per_innings'>) {
    assertMatchName(input);

    const parentMatch = await this.get(parentMatchId);
    if (parentMatch.is_super_over) throw new Error('Cannot start a Super Over from another Super Over.');
    if (parentMatch.status !== 'completed' || parentMatch.winner !== null) {
      throw new Error('A Super Over can only be started after a completed tied match.');
    }

    const { data: existingSuperOver, error: existingError } = await supabase
      .from('matches')
      .select('id')
      .eq('parent_match_id', parentMatchId)
      .eq('is_super_over', true)
      .maybeSingle();

    if (existingError) throw parseSupabaseError(existingError);
    if (existingSuperOver) throw new Error('This match already has a Super Over.');

    return this.create({
      ...input,
      parent_match_id: parentMatchId,
      is_super_over: true,
      overs_per_innings: 1,
      status: 'draft'
    });
  },

  async history() {
    const matches = await this.list();
    const parentMatches = matches.filter((match) => !match.is_super_over);
    const superOversByParent = new Map(matches.filter((match) => match.is_super_over && match.parent_match_id).map((match) => [match.parent_match_id, match]));

    return parentMatches.map((match) => {
      const superOver = superOversByParent.get(match.id) ?? null;
      return {
        match,
        superOver,
        finalWinner: superOver?.winner ?? match.winner,
        finalResultText: superOver?.result_text ?? match.result_text
      };
    });
  },

  async getInnings(matchId: string) {
    const { data, error } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', matchId)
      .order('innings_number', { ascending: true });
    return requireData(data, error);
  },

  async updateInnings(inningsId: string, input: Database['public']['Tables']['innings']['Update']) {
    const { data, error } = await supabase
      .from('innings')
      .update(input)
      .eq('id', inningsId)
      .select()
      .single();
    return requireData(data, error);
  },

  async setInProgress(matchId: string) {
    return this.update(matchId, { status: 'in_progress' });
  },

  async completeMatch(
  matchId: string,
  winner: TeamSide | null,
  resultText: string,
  playerOfMatchId?: string | null
) {
    return this.update(matchId, {
  status: 'completed',
  winner,
  result_text: resultText,
  player_of_match_id: playerOfMatchId ?? null
});
  },

  async delete(matchId: string) {
    const match = await this.get(matchId);
    if (match.status === 'completed') {
      await this.update(matchId, { status: 'draft' });
    }
    const { data, error } = await supabase.from('matches').delete().eq('id', matchId).select();
    return requireData(data, error);
  },

  async reset(matchId: string) {
    const { error: deleteInningsError } = await supabase.from('innings').delete().eq('match_id', matchId);
    if (deleteInningsError) throw parseSupabaseError(deleteInningsError);

    return this.update(matchId, {
      status: 'teams_created',
      toss_winner: null,
      toss_decision: null,
      batting_first: null,
      winner: null,
      result_text: null
    });
  }
};
