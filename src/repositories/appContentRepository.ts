import { supabase } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { requireData, parseSupabaseError } from './supabaseErrors';

export type AppContentInsert = Database['public']['Tables']['app_content']['Insert'];
export type AppContentUpdate = Database['public']['Tables']['app_content']['Update'];

const DEVELOPER_PHOTO_PATH = 'developer/profile';

const DEFAULT_ABOUT_CONTENT = {
  description: 'Sunday Strikers is a competitive weekend cricket league that brings together passionate players for exciting matches every Sunday. Track scores, view statistics, and stay connected with the game.',
  features: [
    '🏏 Live Scoring – Real-time ball-by-ball updates during matches.',
    '📊 Statistics – Comprehensive player and match analytics.',
    '🏆 Leaderboards – Competitive rankings for batters, bowlers, and all-rounders.',
    '📅 Availability Tracking – Players can mark their availability for upcoming matches.',
    '🎯 Awards & Records – Player of the Match, season awards, and career milestones.'
  ],
  footerNote: 'Built by Arun R.',
  profilePhotoUrl: ''
};

export const appContentRepository = {
  async getByKey(key: string) {
    const { data, error } = await supabase.from('app_content').select('*').eq('key', key).maybeSingle();
    if (error) throw parseSupabaseError(error);
    return data;
  },

  async list() {
    const { data, error } = await supabase.from('app_content').select('*').order('key');
    return requireData(data, error);
  },

  async update(id: string, input: AppContentUpdate) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('app_content')
      .update({ ...input, updated_at: now })
      .eq('id', id)
      .select('*')
      .single();
    return requireData(data, error);
  },

  async create(key: string, input: { title: string; content: string }) {
    const insert: AppContentInsert = { key, title: input.title, content: input.content };
    const { data, error } = await supabase.from('app_content').insert(insert).select('*').single();
    return requireData(data, error);
  },

  async createDefaultAboutPage() {
    return this.create('about_page', {
      title: 'About Sunday Strikers',
      content: JSON.stringify(DEFAULT_ABOUT_CONTENT)
    });
  },

  async uploadPhoto(file: File, folder: string, filename: string) {
    if (!file.type.startsWith('image/')) throw new Error('Only image files can be uploaded.');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const path = `${folder}/${filename}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(path, file, { cacheControl: '3600', upsert: true });
    if (uploadError) throw parseSupabaseError(uploadError);
    const { data: urlData } = supabase.storage.from('player-photos').getPublicUrl(path);
    return urlData.publicUrl;
  },

  async uploadDeveloperPhoto(file: File) {
    return this.uploadPhoto(file, 'developer', 'profile');
  },

  async deleteDeveloperPhoto() {
    const { data: files } = await supabase.storage.from('player-photos').list('developer');
    if (files) {
      for (const file of files) {
        await supabase.storage.from('player-photos').remove([`developer/${file.name}`]);
      }
    }
  }
};
