import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { requireData } from './supabaseErrors';

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
    if (clearError) throw clearError;

    const { data, error } = await supabase.from('seasons').update({ is_active: true }).eq('id', id).select().single();
    return requireData(data, error);
  }
};
