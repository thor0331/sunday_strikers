-- Function to recalculate player stats for a single player in a single season
create or replace function public.recalculate_player_stats(
  p_player_id uuid,
  p_season_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_matches_played integer := 0;
  v_batting_innings integer := 0;
  v_runs integer := 0;
  v_balls_faced integer := 0;
  v_fours integer := 0;
  v_sixes integer := 0;
  v_outs integer := 0;
  v_highest_score integer := 0;
  v_bowling_innings integer := 0;
  v_balls_bowled integer := 0;
  v_runs_conceded integer := 0;
  v_wickets integer := 0;
  v_maidens integer := 0;
  v_catches integer := 0;
  v_run_outs integer := 0;
  v_stumpings integer := 0;
begin
  -- 1. Matches Played: Count matches in this season where player was in match_players and match is completed
  select count(distinct mp.match_id)
  into v_matches_played
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where mp.player_id = p_player_id
    and m.season_id = p_season_id
    and m.status = 'completed';

  -- 2. Batting Innings & aggregate batting stats:
  -- Runs, balls faced, fours, sixes from ball_events where striker_id = p_player_id in completed matches of the season
  select
    count(distinct be.innings_id),
    coalesce(sum(be.runs_batter), 0),
    coalesce(sum(case when be.is_legal_delivery = true and be.extra_type is null then 1 else 0 end), 0), -- balls faced (legal non-extra)
    coalesce(sum(case when be.runs_batter = 4 then 1 else 0 end), 0),
    coalesce(sum(case when be.runs_batter = 6 then 1 else 0 end), 0)
  into
    v_batting_innings,
    v_runs,
    v_balls_faced,
    v_fours,
    v_sixes
  from public.ball_events be
  join public.matches m on m.id = be.match_id
  where be.striker_id = p_player_id
    and m.season_id = p_season_id
    and m.status = 'completed';

  -- 3. Outs: Count times dismissed in completed matches of the season
  select count(*)
  into v_outs
  from public.ball_events be
  join public.matches m on m.id = be.match_id
  where be.dismissed_player_id = p_player_id
    and be.is_wicket = true
    and m.season_id = p_season_id
    and m.status = 'completed';

  -- 4. Highest Score: Max runs in a single innings in completed matches of the season
  select coalesce(max(inn_runs), 0)
  into v_highest_score
  from (
    select sum(be.runs_batter) as inn_runs
    from public.ball_events be
    join public.matches m on m.id = be.match_id
    where be.striker_id = p_player_id
      and m.season_id = p_season_id
      and m.status = 'completed'
    group by be.innings_id
  ) t;

  -- 5. Bowling Innings & aggregate bowling stats:
  -- Balls bowled, runs conceded, wickets from completed matches of the season
  select
    count(distinct be.innings_id),
    coalesce(sum(case when be.is_legal_delivery = true then 1 else 0 end), 0),
    -- Runs conceded: byes and leg byes do NOT count against bowler, but runs_batter + other extras do
    coalesce(sum(case when be.extra_type in ('bye', 'leg_bye') then be.runs_batter else (be.runs_batter + be.runs_extra) end), 0),
    coalesce(sum(case when be.is_wicket = true and be.wicket_type in ('bowled', 'caught', 'lbw', 'stumped', 'hit_wicket') then 1 else 0 end), 0)
  into
    v_bowling_innings,
    v_balls_bowled,
    v_runs_conceded,
    v_wickets
  from public.ball_events be
  join public.matches m on m.id = be.match_id
  where be.bowler_id = p_player_id
    and m.season_id = p_season_id
    and m.status = 'completed';

  -- 6. Maidens: Count overs bowled in completed matches of this season where runs conceded in that over was 0
  select count(*)
  into v_maidens
  from (
    select
      be.innings_id,
      be.over_number,
      sum(case when be.extra_type in ('bye', 'leg_bye') then be.runs_batter else (be.runs_batter + be.runs_extra) end) as over_runs,
      sum(case when be.is_legal_delivery = true then 1 else 0 end) as legal_balls
    from public.ball_events be
    join public.matches m on m.id = be.match_id
    where be.bowler_id = p_player_id
      and m.season_id = p_season_id
      and m.status = 'completed'
    group by be.innings_id, be.over_number
    having sum(case when be.is_legal_delivery = true then 1 else 0 end) = 6 -- must be a complete 6-ball over
       and sum(case when be.extra_type in ('bye', 'leg_bye') then be.runs_batter else (be.runs_batter + be.runs_extra) end) = 0
  ) t;

  -- 7. Fielding stats: catches, run outs, stumpings in completed matches of the season
  select
    coalesce(sum(case when be.wicket_type = 'caught' then 1 else 0 end), 0),
    coalesce(sum(case when be.wicket_type = 'run_out' then 1 else 0 end), 0),
    coalesce(sum(case when be.wicket_type = 'stumped' then 1 else 0 end), 0)
  into
    v_catches,
    v_run_outs,
    v_stumpings
  from public.ball_events be
  join public.matches m on m.id = be.match_id
  where be.fielder_id = p_player_id
    and be.is_wicket = true
    and m.season_id = p_season_id
    and m.status = 'completed';

  -- 8. Upsert the stats
  insert into public.player_statistics (
    player_id,
    season_id,
    matches_played,
    batting_innings,
    runs,
    balls_faced,
    fours,
    sixes,
    outs,
    highest_score,
    bowling_innings,
    balls_bowled,
    runs_conceded,
    wickets,
    maidens,
    catches,
    run_outs,
    stumpings,
    updated_at
  )
  values (
    p_player_id,
    p_season_id,
    v_matches_played,
    v_batting_innings,
    v_runs,
    v_balls_faced,
    v_fours,
    v_sixes,
    v_outs,
    v_highest_score,
    v_bowling_innings,
    v_balls_bowled,
    v_runs_conceded,
    v_wickets,
    v_maidens,
    v_catches,
    v_run_outs,
    v_stumpings,
    now()
  )
  on conflict (player_id, season_id)
  do update set
    matches_played = excluded.matches_played,
    batting_innings = excluded.batting_innings,
    runs = excluded.runs,
    balls_faced = excluded.balls_faced,
    fours = excluded.fours,
    sixes = excluded.sixes,
    outs = excluded.outs,
    highest_score = excluded.highest_score,
    bowling_innings = excluded.bowling_innings,
    balls_bowled = excluded.balls_bowled,
    runs_conceded = excluded.runs_conceded,
    wickets = excluded.wickets,
    maidens = excluded.maidens,
    catches = excluded.catches,
    run_outs = excluded.run_outs,
    stumpings = excluded.stumpings,
    updated_at = now();
end;
$$;

-- Trigger function to run when a match status is updated to or from completed
create or replace function public.on_match_status_change()
returns trigger
language plpgsql
security definer
as $$
declare
  r_player record;
begin
  if (new.status = 'completed' and (old.status is null or old.status != 'completed')) or
     (new.status != 'completed' and old.status = 'completed') then
    -- Loop over all players in this match
    for r_player in (
      select player_id
      from public.match_players
      where match_id = new.id
    ) loop
      -- If match has a season, recalculate stats for that season
      if new.season_id is not null then
        perform public.recalculate_player_stats(r_player.player_id, new.season_id);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

-- Create trigger on matches table
drop trigger if exists tr_match_completed on public.matches;
create trigger tr_match_completed
  after update of status on public.matches
  for each row
  execute function public.on_match_status_change();
