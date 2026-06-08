import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { requireData } from './supabaseErrors';

export type AvailabilityStatus = Database['public']['Enums']['availability_status'];

export const availabilityRepository = {
  async listMatchesForAvailability() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('is_super_over', false)
      .in('status', ['draft', 'scheduled'])
      .order('match_date', { ascending: true })
      .order('match_number', { ascending: true, nullsFirst: false });

    return requireData(data, error);
  },

  async listForMatch(matchId: string) {
    const { data, error } = await supabase.from('availability').select('*').eq('match_id', matchId);
    return requireData(data, error);
  },

  async setStatus(matchId: string, playerId: string, status: AvailabilityStatus, note?: string | null) {
    const { data, error } = await supabase
      .from('availability')
      .upsert({ match_id: matchId, player_id: playerId, status, note: note || null }, { onConflict: 'match_id,player_id' })
      .select()
      .single();

    return requireData(data, error);
  }
};
