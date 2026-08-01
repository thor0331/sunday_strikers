import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import type { BallEvent } from '../types/models';
import { requireData, parseSupabaseError } from './supabaseErrors';

export type BallEventRow = Database['public']['Tables']['ball_events']['Row'];
export type BallEventInsert = Database['public']['Tables']['ball_events']['Insert'];
export type CreateBallEventInput = Omit<BallEventInsert, 'sequence_number'> & {
  sequence_number?: number;
};

function toBallEvent(row: BallEventRow): BallEvent {
  return {
    id: row.id,
    matchId: row.match_id,
    inningsId: row.innings_id,
    sequenceNumber: row.sequence_number,
    overNumber: row.over_number,
    ballInOver: row.ball_in_over,
    strikerId: row.striker_id,
    nonStrikerId: row.non_striker_id,
    bowlerId: row.bowler_id,
    runsBatter: row.runs_batter as BallEvent['runsBatter'],
    runsExtra: row.runs_extra,
    extraType: row.extra_type,
    isWicket: row.is_wicket,
    wicketType: row.wicket_type,
    dismissedPlayerId: row.dismissed_player_id,
    fielderId: row.fielder_id,
    isLegalDelivery: row.is_legal_delivery,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

async function getNextSequenceNumber(inningsId: string): Promise<number> {
  const { data, error } = await supabase
    .from('ball_events')
    .select('sequence_number')
    .eq('innings_id', inningsId)
    .order('sequence_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw parseSupabaseError(error);
  return (data?.sequence_number ?? 0) + 1;
}

export const ballEventsRepository = {
  async createBallEvent(input: CreateBallEventInput): Promise<BallEvent> {
    const sequenceNumber = input.sequence_number ?? (await getNextSequenceNumber(input.innings_id));
    const payload: BallEventInsert = {
      ...input,
      sequence_number: sequenceNumber
    };

    const { data, error } = await supabase.from('ball_events').insert(payload).select().single();
    return toBallEvent(requireData(data, error));
  },

  async getBallEvents(inningsId: string): Promise<BallEvent[]> {
    const { data, error } = await supabase.from('ball_events').select('*').eq('innings_id', inningsId).order('sequence_number', { ascending: true });
    return requireData(data, error).map(toBallEvent);
  },

  async getBallEventsByMatches(matchIds: string[]): Promise<BallEvent[]> {
    if (matchIds.length === 0) return [];
    const { data, error } = await supabase
      .from('ball_events')
      .select('*')
      .in('match_id', matchIds)
      .order('sequence_number', { ascending: true });
    return requireData(data, error).map(toBallEvent);
  },

  async deleteLastBallEvent(inningsId: string): Promise<BallEvent | null> {
    const { data: latest, error: latestError } = await supabase
      .from('ball_events')
      .select('*')
      .eq('innings_id', inningsId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) throw parseSupabaseError(latestError);
    if (!latest) return null;

    const { error: deleteError } = await supabase.from('ball_events').delete().eq('id', latest.id);
    if (deleteError) throw parseSupabaseError(deleteError);

    return toBallEvent(latest);
  }
};
