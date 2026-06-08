import { supabase } from '../services/supabaseClient';
import { requireData } from './supabaseErrors';

export const statisticsRepository = {
  async listPlayerStatistics() {
    const { data, error } = await supabase.from('player_statistics').select('*').order('runs', { ascending: false });
    return requireData(data, error);
  }
};
