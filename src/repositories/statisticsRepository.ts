import { supabase } from '../services/supabaseClient';
import { requireData, parseSupabaseError } from './supabaseErrors';
import type { Database } from '../types/database';

type PlayerStatisticsInsert = Database['public']['Tables']['player_statistics']['Insert'];

export const statisticsRepository = {
  async listPlayerStatistics() {
    const { data, error } = await supabase.from('player_statistics').select('*').order('runs', { ascending: false });
    return requireData(data, error);
  },

  async upsertStatistics(rows: PlayerStatisticsInsert[]): Promise<void> {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from('player_statistics')
      .upsert(rows, { onConflict: 'player_id,season_id' });
    if (error) throw parseSupabaseError(error);
  }
};
