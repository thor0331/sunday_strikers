import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { requireData, parseSupabaseError } from './supabaseErrors';

export type SeasonInsert = Database['public']['Tables']['seasons']['Insert'];
export type SeasonUpdate = Database['public']['Tables']['seasons']['Update'];

export const seasonRepository = {
  async list() {
    const { data, error } = await supabase.from('seasons').select('*').order('start_date', { ascending: false });
    return requireData(data, error);
  },

  async create(input: SeasonInsert) {
    if (!input.name.trim()) throw new Error('Season name is required.');
    const { data, error } = await supabase.from('seasons').insert(input).select().single();
    return requireData(data, error);
  },

  async update(id: string, input: SeasonUpdate) {
    if (input.name !== undefined && !input.name.trim()) throw new Error('Season name is required.');
    const { data, error } = await supabase.from('seasons').update(input).eq('id', id).select().single();
    return requireData(data, error);
  },

  async setActive(id: string) {
    const { error: clearError } = await supabase.from('seasons').update({ is_active: false }).neq('id', id);
    if (clearError) throw parseSupabaseError(clearError);

    const { data, error } = await supabase.from('seasons').update({ is_active: true }).eq('id', id).select().single();
    return requireData(data, error);
  },

  async delete(id: string) {
    const { data: season, error: fetchError } = await supabase
      .from('seasons').select('*').eq('id', id).single();
    if (fetchError) throw parseSupabaseError(fetchError);

    const { error: matchesError } = await supabase
      .from('matches').delete().eq('season_id', id);
    if (matchesError) throw parseSupabaseError(matchesError);

    const { error: deleteError } = await supabase
      .from('seasons').delete().eq('id', id);
    if (deleteError) throw parseSupabaseError(deleteError);

    if (season.is_active) {
      const { data: remaining } = await supabase
        .from('seasons').select('id')
        .order('created_at', { ascending: false }).limit(1);
      if (remaining && remaining.length > 0) {
        const { error: promoteError } = await supabase
          .from('seasons').update({ is_active: true }).eq('id', remaining[0].id);
        if (promoteError) throw parseSupabaseError(promoteError);
      }
    }

    return { deletedSeasonId: id };
  }
};
