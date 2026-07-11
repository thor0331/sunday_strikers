import type { Database } from './database';

export type PlayerStatus = Database['public']['Enums']['player_status'];
export type MatchStatus = Database['public']['Enums']['match_status'];
export type InningsStatus = Database['public']['Enums']['innings_status'];
export type TeamSide = Database['public']['Enums']['innings_side'];
export type TossDecision = Database['public']['Enums']['toss_decision'];
export type ExtraType = Database['public']['Enums']['extra_type'];
export type WicketType = Database['public']['Enums']['wicket_type'];
export type AvailabilityStatus = Database['public']['Enums']['availability_status'];
export type AwardType = Database['public']['Enums']['award_type'];
export type MatchFormat = 'short_boundary' | 'long_boundary';

export type GroupSettings = Database['public']['Tables']['group_settings']['Row'];
export type Season = Database['public']['Tables']['seasons']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type MatchInsert = Database['public']['Tables']['matches']['Insert'];
export type Availability = Database['public']['Tables']['availability']['Row'];
export type MatchPlayer = Database['public']['Tables']['match_players']['Row'];
export type Innings = Database['public']['Tables']['innings']['Row'];
export type BallEventRow = Database['public']['Tables']['ball_events']['Row'];
export type MatchAward = Database['public']['Tables']['match_awards']['Row'];
export type PlayerStatistics = Database['public']['Tables']['player_statistics']['Row'];

export interface BallEvent {
  id: string;
  matchId: string;
  inningsId: string;
  sequenceNumber: number;
  overNumber: number;
  ballInOver: number;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsBatter: 0 | 1 | 2 | 3 | 4 | 6;
  runsExtra: number;
  extraType: ExtraType | null;
  isWicket: boolean;
  wicketType: WicketType | null;
  dismissedPlayerId: string | null;
  fielderId: string | null;
  isLegalDelivery: boolean;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface BatterInningsStats {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissalText: string | null;
  strikeRate: number;
}

export interface BowlerInningsStats {
  playerId: string;
  balls: number;
  oversDisplay: string;
  runsConceded: number;
  wickets: number;
  maidens: number;
  economy: number;
}

export interface DerivedInningsState {
  inningsId: string;
  totalRuns: number;
  wickets: number;
  legalBalls: number;
  oversDisplay: string;
  strikerId: string | null;
  nonStrikerId: string | null;
  currentBowlerId: string | null;
  battingStats: Record<string, BatterInningsStats>;
  bowlingStats: Record<string, BowlerInningsStats>;
  currentRunRate: number;
  requiredRunRate: number | null;
  targetRuns: number | null;
  runsRequired: number | null;
  ballsRemaining: number | null;
  isAllOut: boolean;
  isOversComplete: boolean;
  isTargetReached: boolean;
  isCompleted: boolean;
}

export type AppContent = Database['public']['Tables']['app_content']['Row'];

export interface DeveloperCard {
  name: string;
  role: string;
  photoUrl?: string;
  email?: string;
  github?: string;
  linkedin?: string;
  website?: string;
}

export interface AboutPageContent {
  description: string;
  features: string[];
  footerNote: string;
  profilePhotoUrl?: string;
  clubLogo?: string;
  clubBanner?: string;
  clubName?: string;
  establishedYear?: string;
  homeGround?: string;
  location?: string;
  clubMotto?: string;
  aboutClub?: string;
  clubStory?: string;
  mission?: string;
  vision?: string;
  contactEmail?: string;
  instagram?: string;
  facebook?: string;
  developers?: DeveloperCard[];
}

export interface MatchHistoryItem {
  match: Match;
  superOver: Match | null;
  finalWinner: TeamSide | null;
  finalResultText: string | null;
}
