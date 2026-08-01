create table public.app_content (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null default '',
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_content enable row level security;

create policy "Public read access"
  on public.app_content
  for select
  to anon, authenticated
  using (true);

create policy "Admins can manage app content"
  on public.app_content
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- seed default about page
insert into public.app_content (key, title, content) values
  ('about_page', 'About Sunday Strikers', json_build_object(
    'description', 'Sunday Strikers is a competitive weekend cricket league that brings together passionate players for exciting matches every Sunday. Track scores, view statistics, and stay connected with the game.',
    'features', json_build_array(
      '🏏 Live Scoring – Real-time ball-by-ball updates during matches.',
      '📊 Statistics – Comprehensive player and match analytics.',
      '🏆 Leaderboards – Competitive rankings for batters, bowlers, and all-rounders.',
      '📅 Availability Tracking – Players can mark their availability for upcoming matches.',
      '🎯 Awards & Records – Player of the Match, season awards, and career milestones.'
    ),
    'footerNote', 'Built by Arun R.',
    'profilePhotoUrl', ''
  )::text);
