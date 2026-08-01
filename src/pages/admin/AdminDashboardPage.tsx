import { motion } from 'framer-motion';
import {
  Users, PlusCircle, CalendarRange, BarChart3, Trophy, TrendingUp,
  ArrowRight, LogOut, CircleDot, Wrench
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/forms/Button';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useParentMatches, useDeleteMatch, useResetMatch, useInnings } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import { useSeasons } from '../../hooks/useSeasons';
import { useSession, useSignOut } from '../../hooks/useAuth';
import { Skeleton } from '../../components/common/Skeleton';

const quickActions = [
  { to: '/admin/players', label: 'Players', icon: Users, subtitle: 'Manage squad', gradient: 'from-accent-blue to-blue-600', glow: 'blue' as const },
  { to: '/admin/matches/new', label: 'New Match', icon: PlusCircle, subtitle: 'Create fixture', gradient: 'from-accent-green to-emerald-600', glow: 'green' as const },
  { to: '/admin/seasons', label: 'Seasons', icon: CalendarRange, subtitle: 'Manage seasons', gradient: 'from-accent-warning to-amber-600', glow: 'yellow' as const },
  { to: '/leaderboards', label: 'Leaders', icon: BarChart3, subtitle: 'Top performers', gradient: 'from-accent-danger to-red-600', glow: 'red' as const },
  { to: '/hall-of-fame', label: 'Hall of Fame', icon: Trophy, subtitle: 'Club legends', gradient: 'from-purple-500 to-violet-600', glow: 'none' as const },
  { to: '/records', label: 'Records', icon: TrendingUp, subtitle: 'Club history', gradient: 'from-teal-500 to-cyan-600', glow: 'none' as const },
  { to: '/admin/maintenance', label: 'Maintenance', icon: Wrench, subtitle: 'System tools', gradient: 'from-slate-500 to-slate-700', glow: 'none' as const }
];

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  scheduled: { label: 'Scheduled', variant: 'info' },
  teams_created: { label: 'Teams Set', variant: 'info' },
  toss_completed: { label: 'Toss Done', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'success' },
  completed: { label: 'Completed', variant: 'default' },
  abandoned: { label: 'Abandoned', variant: 'danger' },
  draft: { label: 'Draft', variant: 'default' }
};

export function AdminDashboardPage() {
  const { data: matches = [], isLoading: matchesLoading } = useParentMatches();
  const { data: players = [], isLoading: playersLoading } = usePlayers();
  const { data: seasons = [], isLoading: seasonsLoading } = useSeasons();
  const { data: sessionData } = useSession();
  const signOut = useSignOut();

  const deleteMatch = useDeleteMatch();
  const resetMatch = useResetMatch();

  const matchDay = useMemo(() => {
    return matches.find((m) => ['scheduled', 'teams_created', 'toss_completed', 'in_progress'].includes(m.status));
  }, [matches]);

  const { data: matchDayInnings = [] } = useInnings(matchDay?.id ?? null);

  const activeInnings = useMemo(() => {
    if (!matchDay || matchDay.status !== 'in_progress') return null;
    return matchDayInnings.find((i) => i.status === 'in_progress') ?? null;
  }, [matchDayInnings, matchDay]);

  const userEmail = sessionData?.user?.email ?? '';
  const userName = userEmail.split('@')[0] || 'there';
  const greetingName = userName.charAt(0).toUpperCase() + userName.slice(1);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const totalPlayers = players.length;
  const totalSeasons = seasons.length;
  const totalMatches = matches.length;
  const completedMatches = matches.filter((m) => m.status === 'completed').length;
  const ongoingMatches = matches.filter((m) => m.status === 'in_progress').length;

  const winRate = completedMatches > 0
    ? Math.round((matches.filter((m) => m.status === 'completed' && m.winner != null).length / completedMatches) * 100)
    : 0;

  const completionPct = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  const recentMatches = useMemo(() => {
    return [...matches]
      .sort((a, b) => b.match_date.localeCompare(a.match_date))
      .slice(0, 6);
  }, [matches]);

  async function handleDeleteMatch(matchId: string, matchName: string) {
    if (window.confirm(`Delete match "${matchName}"?\n\nThis permanently deletes the match, scoring, innings, teams, and availability.`)) {
      await deleteMatch.mutateAsync(matchId);
    }
  }

  async function handleResetMatch(matchId: string, matchName: string) {
    if (window.confirm(`Reset match "${matchName}"?\n\nThis deletes all innings and ball events and resets the match to pre-toss state. Teams stay intact.`)) {
      await resetMatch.mutateAsync(matchId);
    }
  }

  const isLoading = matchesLoading || playersLoading || seasonsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[18px]" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-[18px]" />
        <Skeleton className="h-48 w-full rounded-[18px]" />
      </div>
    );
  }

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as const }
  });

  const tossDesc = matchDay?.toss_winner
    ? `${matchDay.toss_winner === 'team_a' ? matchDay.team_a_name : matchDay.team_b_name} won • ${matchDay.toss_decision === 'bat' ? 'Chose to bat' : 'Chose to bowl'}`
    : null;

  return (
    <div className="relative min-h-screen">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-float-gradient absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent-green/5 blur-[128px]" />
        <div className="animate-float-gradient-2 absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-accent-blue/5 blur-[128px]" />
        <div className="animate-float-gradient absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-accent-warning/4 blur-[128px]" />
        <div className="animate-float-gradient-2 absolute bottom-1/4 right-1/3 h-48 w-48 rounded-full bg-accent-danger/3 blur-[96px]" />
      </div>

      <div className="relative z-10 page-container mx-auto max-w-6xl space-y-10 px-4 py-6 md:px-6 md:py-10">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Sunday Strikers</h1>
            <p className="mt-1 text-sm font-medium text-slate-400">{greeting}, {greetingName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void signOut.mutateAsync()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Hero Card */}
        {matchDay ? (
          <motion.div {...fadeUp(0.05)}>
            <GlassCard
              glow={matchDay.status === 'in_progress' ? 'green' : 'blue'}
              className="card-radial glass-reflect card-inner-shadow relative overflow-hidden !p-0"
            >
              <div className="h-1 w-full bg-gradient-to-r from-accent-green via-emerald-400 to-accent-green" />
              <div className="p-6 md:p-8">
                {/* Status + Meta Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {matchDay.status === 'in_progress' ? (
                    <Badge variant="success" size="md">
                      <span className="relative mr-1.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
                      </span>
                      <span className="animate-breath">Live</span>
                    </Badge>
                  ) : (
                    <Badge variant={statusConfig[matchDay.status]?.variant ?? 'default'} size="md">
                      {statusConfig[matchDay.status]?.label ?? matchDay.status.replace('_', ' ')}
                    </Badge>
                  )}
                  <span className="text-xs font-medium text-slate-400">{matchDay.match_date}</span>
                  {matchDay.venue && (
                    <>
                      <span className="hidden text-xs text-slate-500 md:inline">•</span>
                      <span className="hidden text-xs font-medium text-slate-400 md:inline">{matchDay.venue}</span>
                    </>
                  )}
                  {matchDay.status === 'in_progress' && activeInnings && (
                    <>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs font-semibold text-accent-green">
                        {activeInnings.batting_team === 'team_a' ? matchDay.team_a_name : matchDay.team_b_name} batting
                      </span>
                    </>
                  )}
                </div>

                {/* Match Title + Format */}
                <h2 className="mt-4 text-xl font-bold text-white md:text-2xl">{matchDay.match_name}</h2>
                <p className="mt-1 text-sm font-medium text-slate-300">
                  {matchDay.team_a_name}<span className="mx-2 text-slate-500">vs</span>{matchDay.team_b_name}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                  <span>{matchDay.overs_per_innings} overs per side</span>
                  <span>{matchDay.players_per_team} players</span>
                  {matchDay.match_number && <span>Match #{matchDay.match_number}</span>}
                </div>

                {/* Pre-Match / Live / Toss Context */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {tossDesc && matchDay.status !== 'in_progress' && (
                    <div className="rounded-lg bg-white/5 px-3 py-1.5">
                      <p className="text-xs font-medium text-slate-400">Toss</p>
                      <p className="text-sm font-semibold text-white/80">{tossDesc}</p>
                    </div>
                  )}
                  {matchDay.batting_first && matchDay.status !== 'in_progress' && (
                    <div className="rounded-lg bg-white/5 px-3 py-1.5">
                      <p className="text-xs font-medium text-slate-400">Batting First</p>
                      <p className="text-sm font-semibold text-accent-green">
                        {matchDay.batting_first === 'team_a' ? matchDay.team_a_name : matchDay.team_b_name}
                      </p>
                    </div>
                  )}
                  {matchDay.status === 'in_progress' && activeInnings && activeInnings.target_runs && (
                    <div className="rounded-lg bg-white/5 px-3 py-1.5">
                      <p className="text-xs font-medium text-slate-400">Target</p>
                      <p className="text-sm font-semibold text-accent-warning">{activeInnings.target_runs} runs</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {matchDay.status === 'in_progress' && (
                    <Link to={`/admin/matches/${matchDay.id}/scoring`}>
                      <Button>
                        Resume Match
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {['draft', 'scheduled'].includes(matchDay.status) && (
                    <Link to={`/admin/matches/${matchDay.id}/teams`}>
                      <Button>Setup Teams</Button>
                    </Link>
                  )}
                  {matchDay.status === 'teams_created' && (
                    <Link to={`/admin/matches/${matchDay.id}/toss`}>
                      <Button>Conduct Toss</Button>
                    </Link>
                  )}
                  {matchDay.status === 'toss_completed' && (
                    <Link to={`/admin/matches/${matchDay.id}/scoring`}>
                      <Button>Start Scoring</Button>
                    </Link>
                  )}
                  <Link to={`/admin/matches/${matchDay.id}/edit`}>
                    <Button variant="secondary" size="sm">Edit</Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleResetMatch(matchDay.id, matchDay.match_name)} disabled={resetMatch.isPending}>
                    Reset
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div {...fadeUp(0.05)}>
            <GlassCard className="glass-reflect card-inner-shadow relative overflow-hidden text-center !py-14">
              <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <CircleDot className="mx-auto h-10 w-10 text-white/15" />
              <p className="mt-4 text-xl font-bold text-white">No Match Scheduled Today</p>
              <p className="mt-1 text-sm font-medium text-slate-400">Create a new match to get started on the action.</p>
              <div className="mt-6">
                <Link to="/admin/matches/new">
                  <Button>
                    <PlusCircle className="mr-1.5 h-4 w-4" />
                    Create Match
                  </Button>
                </Link>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Quick Action Tiles */}
        <motion.section {...fadeUp(0.1)}>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to}>
                <GlassCard glow={action.glow} hover className="card-radial glass-reflect group !p-4 transition-all duration-300">
                  <div className={`tile-magnetic mb-3 inline-flex rounded-xl bg-gradient-to-br ${action.gradient} p-2.5 shadow-lg shadow-black/20`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm font-extrabold text-white">{action.label}</p>
                  <p className="mt-0.5 text-[11px] font-medium tracking-wide text-slate-400">{action.subtitle}</p>
                </GlassCard>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Recent Matches + Season Stats */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Recent Matches */}
          <motion.section {...fadeUp(0.15)} className="lg:col-span-2">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Recent Matches</h2>
            {recentMatches.length === 0 ? (
              <GlassCard className="text-center !py-10">
                <p className="text-sm font-medium text-slate-400">No matches yet</p>
              </GlassCard>
            ) : (
              <div className="scroll-snap-x -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
                {recentMatches.map((match, i) => {
                  const cfg = statusConfig[match.status] ?? { label: match.status.replace('_', ' '), variant: 'default' as const };
                  return (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] as const }}
                      className="scroll-snap-start w-[220px] flex-none sm:w-[240px]"
                    >
                      <Link to={
                        match.status === 'completed'
                          ? `/admin/matches/${match.id}/details`
                          : ['toss_completed', 'in_progress'].includes(match.status)
                            ? `/admin/matches/${match.id}/scoring`
                            : `/admin/matches/${match.id}/edit`
                      }>
                        <GlassCard hover className="card-radial glass-reflect hover-depth !p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-extrabold text-white">{match.match_name}</p>
                            <Badge variant={cfg.variant} size="sm" className="shrink-0">{cfg.label}</Badge>
                          </div>
                          <p className="mt-2 text-xs font-medium text-slate-400">{match.team_a_name} vs {match.team_b_name}</p>
                          <p className="mt-4 text-[11px] font-medium tracking-wide text-slate-400">{match.match_date}</p>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>

          {/* Season Overview */}
          <motion.section {...fadeUp(0.2)}>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Season Overview</h2>
            <GlassCard className="card-radial glass-reflect card-inner-shadow !p-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="text-center">
                  <p className="animate-count-up enter-1 text-3xl font-extrabold text-white">{totalMatches}</p>
                  <p className="mt-1 text-xs font-medium tracking-wide text-slate-400">Matches</p>
                </div>
                <div className="text-center">
                  <p className="animate-count-up enter-2 text-3xl font-extrabold text-accent-green">{completedMatches}</p>
                  <p className="mt-1 text-xs font-medium tracking-wide text-slate-400">Completed</p>
                </div>
                <div className="text-center">
                  <p className="animate-count-up enter-3 text-3xl font-extrabold text-accent-warning">{ongoingMatches}</p>
                  <p className="mt-1 text-xs font-medium tracking-wide text-slate-400">Active</p>
                </div>
                <div className="text-center">
                  <p className="animate-count-up enter-4 text-3xl font-extrabold text-accent-blue">{winRate}%</p>
                  <p className="mt-1 text-xs font-medium tracking-wide text-slate-400">Win Rate</p>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium tracking-wide text-slate-400">Completion</span>
                  <span className="font-bold text-white">{completionPct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent-green to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
                  />
                </div>
              </div>
              <div className="mt-5 space-y-3 border-t border-white/8 pt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium tracking-wide text-slate-400">Players</span>
                  <span className="font-bold text-white">{totalPlayers}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium tracking-wide text-slate-400">Seasons</span>
                  <span className="font-bold text-white">{totalSeasons}</span>
                </div>
              </div>
            </GlassCard>
          </motion.section>
        </div>

        {/* All Matches */}
        <motion.section {...fadeUp(0.25)}>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">All Matches</h2>
          {matches.length === 0 ? (
            <GlassCard className="text-center !py-10">
              <p className="text-sm font-medium text-slate-400">No matches created yet.</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {matches.map((match, i) => {
                const cfg = statusConfig[match.status] ?? { label: match.status.replace('_', ' '), variant: 'default' as const };
                const canEdit = ['draft', 'scheduled', 'teams_created'].includes(match.status);
                const canReset = ['toss_completed', 'in_progress', 'completed'].includes(match.status);

                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] as const }}
                  >
                    <GlassCard hover className="card-radial glass-reflect hover-depth !p-4 md:!p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-extrabold text-white">{match.match_name}</h3>
                            <Badge variant={cfg.variant} size="sm" className="shrink-0">{cfg.label}</Badge>
                          </div>
                          <p className="mt-1.5 text-xs font-medium text-slate-400">
                            {match.match_date}
                            {match.venue && <><span className="mx-1.5 text-slate-500">•</span>{match.venue}</>}
                            <span className="mx-1.5 text-slate-500">•</span>
                            {match.overs_per_innings}ov
                            <span className="mx-1.5 text-slate-500">•</span>
                            {match.players_per_team}a side
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-slate-400">
                            {match.team_a_name}<span className="mx-1 text-white/15">vs</span>{match.team_b_name}
                          </p>
                          {match.result_text && match.status === 'completed' && (
                            <p className="mt-1 text-xs font-semibold text-accent-green">{match.result_text}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['draft', 'scheduled'].includes(match.status) && (
                            <Link to={`/admin/matches/${match.id}/teams`}>
                              <Button variant="secondary" size="sm">Teams</Button>
                            </Link>
                          )}
                          {match.status === 'teams_created' && (
                            <Link to={`/admin/matches/${match.id}/toss`}>
                              <Button variant="secondary" size="sm">Toss</Button>
                            </Link>
                          )}
                          {['toss_completed', 'in_progress'].includes(match.status) && (
                            <Link to={`/admin/matches/${match.id}/scoring`}>
                              <Button size="sm">Score</Button>
                            </Link>
                          )}
                          {match.status === 'completed' && (
                            <Link to={`/admin/matches/${match.id}/details`}>
                              <Button variant="secondary" size="sm">Details</Button>
                            </Link>
                          )}
                          <Link to={`/admin/matches/${match.id}/edit`}>
                            <Button variant="ghost" size="sm" disabled={!canEdit}>Edit</Button>
                          </Link>
                          <Button variant="ghost" size="sm" disabled={!canReset || resetMatch.isPending} onClick={() => handleResetMatch(match.id, match.match_name)}>
                            Reset
                          </Button>
                          <Button variant="ghost" size="sm" disabled={deleteMatch.isPending} onClick={() => handleDeleteMatch(match.id, match.match_name)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>

        <MutationStatus
          error={deleteMatch.error || resetMatch.error}
          success={deleteMatch.isSuccess ? 'Match deleted successfully.' : resetMatch.isSuccess ? 'Match reset successfully.' : null}
        />
      </div>
    </div>
  );
}
