import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { requireData } from './supabaseErrors';

export type PlayerInsert = Database['public']['Tables']['players']['Insert'];
export type PlayerUpdate = Database['public']['Tables']['players']['Update'];

export const playerRepository = {
  async list() {
    const { data, error } = await supabase.from('players').select('*').order('display_name');
    return requireData(data, error);
  },

  async create(input: PlayerInsert) {
    if (!input.display_name.trim()) throw new Error('Player name is required.');
    const { data, error } = await supabase.from('players').insert(input).select().single();
    return requireData(data, error);
  },

  async update(id: string, input: PlayerUpdate) {
    if (input.display_name !== undefined && !input.display_name.trim()) {
      throw new Error('Player name is required.');
    }
    const { data, error } = await supabase.from('players').update(input).eq('id', id).select().single();
    return requireData(data, error);
  },

  async remove(id: string) {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
  },

  async uploadPhoto(playerId: string, file: File) {
    if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.');
    const extension = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${playerId}/profile.${extension}`;
    const { error } = await supabase.storage.from('player-photos').upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from('player-photos').getPublicUrl(path);
    return this.update(playerId, { photo_url: data.publicUrl });
  }
};
