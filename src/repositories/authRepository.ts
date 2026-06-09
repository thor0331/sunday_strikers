import { supabase } from '../services/supabaseClient';
import { parseSupabaseError } from './supabaseErrors';

export const authRepository = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw parseSupabaseError(error);
    return data.session;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw parseSupabaseError(error);

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError) throw parseSupabaseError(adminError);
    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error('This account is not an admin.');
    }

    return data.session;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw parseSupabaseError(error);
  }
};
