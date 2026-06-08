alter table public.admin_users enable row level security;
alter table public.group_settings enable row level security;
alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.availability enable row level security;
alter table public.match_players enable row level security;
alter table public.innings enable row level security;
alter table public.ball_events enable row level security;
alter table public.match_awards enable row level security;
alter table public.player_statistics enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

create policy "Admin users can read own admin row"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

create policy "Public can read group settings"
on public.group_settings for select
to anon, authenticated
using (true);

create policy "Admins can manage group settings"
on public.group_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read seasons"
on public.seasons for select
to anon, authenticated
using (true);

create policy "Admins can manage seasons"
on public.seasons for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read players"
on public.players for select
to anon, authenticated
using (true);

create policy "Admins can manage players"
on public.players for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read matches"
on public.matches for select
to anon, authenticated
using (true);

create policy "Admins can manage matches"
on public.matches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read availability"
on public.availability for select
to anon, authenticated
using (true);

create policy "Public can mark match availability"
on public.availability for insert
to anon, authenticated
with check (
  exists (select 1 from public.players p where p.id = player_id and p.status = 'active')
  and exists (select 1 from public.matches m where m.id = match_id and m.status in ('draft', 'scheduled'))
);

create policy "Public can update match availability"
on public.availability for update
to anon, authenticated
using (
  exists (select 1 from public.matches m where m.id = match_id and m.status in ('draft', 'scheduled'))
)
with check (
  exists (select 1 from public.matches m where m.id = match_id and m.status in ('draft', 'scheduled'))
);

create policy "Admins can manage availability"
on public.availability for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read match players"
on public.match_players for select
to anon, authenticated
using (true);

create policy "Admins can manage match players"
on public.match_players for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read innings"
on public.innings for select
to anon, authenticated
using (true);

create policy "Admins can manage innings"
on public.innings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read ball events"
on public.ball_events for select
to anon, authenticated
using (true);

create policy "Admins can manage ball events"
on public.ball_events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read match awards"
on public.match_awards for select
to anon, authenticated
using (true);

create policy "Admins can manage match awards"
on public.match_awards for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read player statistics"
on public.player_statistics for select
to anon, authenticated
using (true);

create policy "Admins can manage player statistics"
on public.player_statistics for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
