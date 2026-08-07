-- Add current crease columns to innings table.
-- The crease (current striker/non-striker/bowler) was previously derived only
-- from ball_events replay, so a batsman change made before the first delivery
-- was lost on refresh (the innings appeared "started but no deliveries").
alter table public.innings
  add column current_striker_id uuid references public.players(id) on delete set null,
  add column current_non_striker_id uuid references public.players(id) on delete set null,
  add column current_bowler_id uuid references public.players(id) on delete set null;

-- Index for faster lookups by crease state
create index idx_innings_crease on public.innings(current_striker_id, current_non_striker_id);
