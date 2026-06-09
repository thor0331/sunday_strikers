-- Add player_of_match_id column to matches table
alter table public.matches
add column player_of_match_id uuid references public.players(id) on delete set null;

-- Create index for faster lookups
create index idx_matches_player_of_match on public.matches(player_of_match_id);
