export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { user_id?: string; created_at?: string };
        Relationships: [];
      };
      group_settings: {
        Row: { id: string; group_name: string; logo_url: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; group_name?: string; logo_url?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; group_name?: string; logo_url?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      seasons: {
        Row: { id: string; name: string; start_date: string; end_date: string | null; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; start_date: string; end_date?: string | null; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; start_date?: string; end_date?: string | null; is_active?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      players: {
        Row: { id: string; display_name: string; full_name: string | null; phone: string | null; photo_url: string | null; batting_style: string | null; bowling_style: string | null; status: Database['public']['Enums']['player_status']; created_at: string; updated_at: string };
        Insert: { id?: string; display_name: string; full_name?: string | null; phone?: string | null; photo_url?: string | null; batting_style?: string | null; bowling_style?: string | null; status?: Database['public']['Enums']['player_status']; created_at?: string; updated_at?: string };
        Update: { id?: string; display_name?: string; full_name?: string | null; phone?: string | null; photo_url?: string | null; batting_style?: string | null; bowling_style?: string | null; status?: Database['public']['Enums']['player_status']; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      matches: {
        Row: {
          id: string; parent_match_id: string | null; season_id: string | null; match_name: string; match_date: string; match_number: number | null; venue: string | null; is_super_over: boolean; overs_per_innings: number; players_per_team: number;
          status: Database['public']['Enums']['match_status']; team_a_name: string; team_b_name: string; team_a_captain_id: string | null; team_b_captain_id: string | null;
          toss_winner: Database['public']['Enums']['innings_side'] | null; toss_decision: Database['public']['Enums']['toss_decision'] | null;
          batting_first: Database['public']['Enums']['innings_side'] | null;
          winner: Database['public']['Enums']['innings_side'] | null;
          player_of_match_id: string | null;
          result_text: string | null;
          notes: string | null;
          match_format: string | null;
        };
        Insert: {
          id?: string; parent_match_id?: string | null; season_id?: string | null; match_name: string; match_date: string; match_number?: number | null; venue?: string | null; is_super_over?: boolean; overs_per_innings?: number; players_per_team?: number;
          status?: Database['public']['Enums']['match_status']; team_a_name?: string; team_b_name?: string; team_a_captain_id?: string | null; team_b_captain_id?: string | null;
          toss_winner?: Database['public']['Enums']['innings_side'] | null; toss_decision?: Database['public']['Enums']['toss_decision'] | null;
          batting_first?: Database['public']['Enums']['innings_side'] | null;
          winner?: Database['public']['Enums']['innings_side'] | null;
          player_of_match_id?: string | null;
          result_text?: string | null;
          notes?: string | null;
          match_format?: string | null;
        };
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
        Relationships: [];
      };
      availability: {
        Row: { id: string; match_id: string; player_id: string; status: Database['public']['Enums']['availability_status']; note: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; match_id: string; player_id: string; status: Database['public']['Enums']['availability_status']; note?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; match_id?: string; player_id?: string; status?: Database['public']['Enums']['availability_status']; note?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      match_players: {
        Row: { id: string; match_id: string; player_id: string; team: Database['public']['Enums']['innings_side']; batting_order: number | null; is_captain: boolean; created_at: string };
        Insert: { id?: string; match_id: string; player_id: string; team: Database['public']['Enums']['innings_side']; batting_order?: number | null; is_captain?: boolean; created_at?: string };
        Update: { id?: string; match_id?: string; player_id?: string; team?: Database['public']['Enums']['innings_side']; batting_order?: number | null; is_captain?: boolean; created_at?: string };
        Relationships: [];
      };
      innings: {
        Row: { id: string; match_id: string; innings_number: number; batting_team: Database['public']['Enums']['innings_side']; bowling_team: Database['public']['Enums']['innings_side']; status: Database['public']['Enums']['innings_status']; target_runs: number | null; started_at: string | null; completed_at: string | null; current_striker_id: string | null; current_non_striker_id: string | null; current_bowler_id: string | null; created_at: string };
        Insert: { id?: string; match_id: string; innings_number: number; batting_team: Database['public']['Enums']['innings_side']; bowling_team: Database['public']['Enums']['innings_side']; status?: Database['public']['Enums']['innings_status']; target_runs?: number | null; started_at?: string | null; completed_at?: string | null; current_striker_id?: string | null; current_non_striker_id?: string | null; current_bowler_id?: string | null; created_at?: string };
        Update: { id?: string; match_id?: string; innings_number?: number; batting_team?: Database['public']['Enums']['innings_side']; bowling_team?: Database['public']['Enums']['innings_side']; status?: Database['public']['Enums']['innings_status']; target_runs?: number | null; started_at?: string | null; completed_at?: string | null; current_striker_id?: string | null; current_non_striker_id?: string | null; current_bowler_id?: string | null; created_at?: string };
        Relationships: [];
      };
      ball_events: {
        Row: {
          id: string; match_id: string; innings_id: string; sequence_number: number; over_number: number; ball_in_over: number; striker_id: string; non_striker_id: string; bowler_id: string;
          runs_batter: number; runs_extra: number; extra_type: Database['public']['Enums']['extra_type'] | null; is_wicket: boolean; wicket_type: Database['public']['Enums']['wicket_type'] | null;
          dismissed_player_id: string | null; incoming_batsman_id: string | null; fielder_id: string | null; is_legal_delivery: boolean; notes: string | null; created_by: string | null; created_at: string;
        };
        Insert: {
          id?: string; match_id: string; innings_id: string; sequence_number: number; over_number: number; ball_in_over: number; striker_id: string; non_striker_id: string; bowler_id: string;
          runs_batter?: number; runs_extra?: number; extra_type?: Database['public']['Enums']['extra_type'] | null; is_wicket?: boolean; wicket_type?: Database['public']['Enums']['wicket_type'] | null;
          dismissed_player_id?: string | null; incoming_batsman_id?: string | null; fielder_id?: string | null; is_legal_delivery: boolean; notes?: string | null; created_by?: string | null; created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ball_events']['Insert']>;
        Relationships: [];
      };
      match_awards: {
        Row: { id: string; match_id: string; player_id: string; award_type: Database['public']['Enums']['award_type']; label: string | null; notes: string | null; created_by: string | null; created_at: string };
        Insert: { id?: string; match_id: string; player_id: string; award_type?: Database['public']['Enums']['award_type']; label?: string | null; notes?: string | null; created_by?: string | null; created_at?: string };
        Update: { id?: string; match_id?: string; player_id?: string; award_type?: Database['public']['Enums']['award_type']; label?: string | null; notes?: string | null; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      player_statistics: {
        Row: {
          id: string; player_id: string; season_id: string | null; matches_played: number; batting_innings: number; runs: number; balls_faced: number; fours: number; sixes: number; outs: number; highest_score: number;
          bowling_innings: number; balls_bowled: number; runs_conceded: number; wickets: number; maidens: number; catches: number; run_outs: number; stumpings: number; created_at: string; updated_at: string;
        };
        Insert: {
          id?: string; player_id: string; season_id?: string | null; matches_played?: number; batting_innings?: number; runs?: number; balls_faced?: number; fours?: number; sixes?: number; outs?: number; highest_score?: number;
          bowling_innings?: number; balls_bowled?: number; runs_conceded?: number; wickets?: number; maidens?: number; catches?: number; run_outs?: number; stumpings?: number; created_at?: string; updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['player_statistics']['Insert']>;
        Relationships: [];
      };
      app_content: {
        Row: {
          id: string;
          key: string;
          title: string;
          content: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          title?: string;
          content?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          title?: string;
          content?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: { is_admin: { Args: Record<PropertyKey, never>; Returns: boolean } };
    Enums: {
      player_status: 'active' | 'inactive';
      match_status: 'draft' | 'scheduled' | 'teams_created' | 'toss_completed' | 'in_progress' | 'completed' | 'abandoned';
      innings_status: 'not_started' | 'in_progress' | 'completed';
      toss_decision: 'bat' | 'bowl';
      innings_side: 'team_a' | 'team_b';
      extra_type: 'wide' | 'no_ball' | 'bye' | 'leg_bye';
      wicket_type: 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket';
      availability_status: 'available' | 'unavailable' | 'maybe';
      award_type: 'man_of_the_match' | 'best_batter' | 'best_bowler' | 'best_fielder' | 'custom';
    };
    CompositeTypes: Record<string, never>;
  };
}
