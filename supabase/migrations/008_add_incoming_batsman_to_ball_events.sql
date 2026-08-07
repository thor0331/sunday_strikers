-- Record the batsman who comes in to bat after a wicket.
-- Previously the incoming batsman was only carried in the in-session scoring
-- context and derived on replay from a batting order built from the recorded
-- opening pair. After a manual batsman swap the opening pair recorded in the
-- ball_events can be stale (the swapped-out batsman is still the "first event"
-- striker), so the derive step silently ignored the scorer's explicit incoming
-- selection and inserted the wrong (next-order) batsman. Persisting the
-- selection on the wicket event makes the scorer's choice authoritative and
-- durable across refresh / undo / replay, mirroring the crease-record trust
-- established in migration 007.
alter table public.ball_events
  add column incoming_batsman_id uuid references public.players(id) on delete set null;

-- Index for wicket lookups by incoming batsman
create index idx_ball_events_incoming_batsman on public.ball_events(incoming_batsman_id);
