create extension if not exists "pgcrypto";

create type player_status as enum ('active', 'inactive');
create type match_status as enum ('draft', 'scheduled', 'teams_created', 'toss_completed', 'in_progress', 'completed', 'abandoned');
create type innings_status as enum ('not_started', 'in_progress', 'completed');
create type toss_decision as enum ('bat', 'bowl');
create type innings_side as enum ('team_a', 'team_b');
create type extra_type as enum ('wide', 'no_ball', 'bye', 'leg_bye');
create type wicket_type as enum ('bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket');
create type availability_status as enum ('available', 'unavailable', 'maybe');
create type award_type as enum ('man_of_the_match', 'best_batter', 'best_bowler', 'best_fielder', 'custom');

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_settings (
  id uuid primary key default gen_random_uuid(),
  group_name text not null default 'Sunday Strikers',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  full_name text,
  phone text,
  photo_url text,
  batting_style text,
  bowling_style text,
  status player_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  parent_match_id uuid references public.matches(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  match_name text not null,
  match_date date not null,
  match_number integer,
  venue text,
  is_super_over boolean not null default false,
  overs_per_innings integer not null default 6 check (overs_per_innings > 0),
  players_per_team integer not null default 6 check (players_per_team > 0),
  status match_status not null default 'draft',
  team_a_name text not null default 'Team A',
  team_b_name text not null default 'Team B',
  team_a_captain_id uuid references public.players(id) on delete set null,
  team_b_captain_id uuid references public.players(id) on delete set null,
  toss_winner innings_side,
  toss_decision toss_decision,
  batting_first innings_side,
  winner innings_side,
  result_text text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_date, match_number),
  check ((is_super_over = false and parent_match_id is null) or (is_super_over = true and parent_match_id is not null))
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status availability_status not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id, player_id)
);

create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team innings_side not null,
  batting_order integer,
  is_captain boolean not null default false,
  created_at timestamptz not null default now(),
  unique(match_id, player_id)
);

create table public.innings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  innings_number integer not null check (innings_number in (1, 2)),
  batting_team innings_side not null,
  bowling_team innings_side not null,
  status innings_status not null default 'not_started',
  target_runs integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(match_id, innings_number)
);

create table public.ball_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  innings_id uuid not null references public.innings(id) on delete cascade,
  sequence_number integer not null,
  over_number integer not null,
  ball_in_over integer not null,
  striker_id uuid not null references public.players(id),
  non_striker_id uuid not null references public.players(id),
  bowler_id uuid not null references public.players(id),
  runs_batter integer not null default 0 check (runs_batter in (0, 1, 2, 3, 4, 6)),
  runs_extra integer not null default 0 check (runs_extra >= 0),
  extra_type extra_type,
  is_wicket boolean not null default false,
  wicket_type wicket_type,
  dismissed_player_id uuid references public.players(id),
  fielder_id uuid references public.players(id),
  is_legal_delivery boolean not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(innings_id, sequence_number),
  check ((is_wicket = false and wicket_type is null and dismissed_player_id is null) or (is_wicket = true and wicket_type is not null and dismissed_player_id is not null))
);

create table public.match_awards (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  award_type award_type not null default 'man_of_the_match',
  label text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(match_id, award_type, player_id)
);

create table public.player_statistics (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  matches_played integer not null default 0,
  batting_innings integer not null default 0,
  runs integer not null default 0,
  balls_faced integer not null default 0,
  fours integer not null default 0,
  sixes integer not null default 0,
  outs integer not null default 0,
  highest_score integer not null default 0,
  bowling_innings integer not null default 0,
  balls_bowled integer not null default 0,
  runs_conceded integer not null default 0,
  wickets integer not null default 0,
  maidens integer not null default 0,
  catches integer not null default 0,
  run_outs integer not null default 0,
  stumpings integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, season_id)
);

create index availability_match_id_idx on public.availability(match_id);
create index availability_player_id_idx on public.availability(player_id);
create index matches_season_date_idx on public.matches(season_id, match_date desc);
create index matches_parent_match_id_idx on public.matches(parent_match_id);
create index ball_events_innings_sequence_idx on public.ball_events(innings_id, sequence_number);
create index player_statistics_season_idx on public.player_statistics(season_id);

insert into public.group_settings (group_name) values ('Sunday Strikers');
