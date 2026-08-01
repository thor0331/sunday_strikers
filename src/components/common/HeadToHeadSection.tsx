import { useMemo } from 'react';
import { useParentMatches } from '../../hooks/useMatches';
import { useInningsByMatches } from '../../hooks/useMatches';
import { useAllBallEvents } from '../../hooks/useBallEvents';
import { GlassCard } from './GlassCard';
import { Skeleton } from './Skeleton';
import { computeHeadToHeadDetails } from '../../utils/headToHeadDetails';
import { Trophy, Target, Timer, Gauge, Swords } from 'lucide-react';

interface HeadToHeadSectionProps {
  teamAName: string;
  teamBName: string;
}

export function HeadToHeadSection({ teamAName, teamBName }: HeadToHeadSectionProps) {
  const { data: allMatches = [] } = useParentMatches();

  const h2hMatches = useMemo(
    () =>
      allMatches.filter(
        (m) =>
          m.status === 'completed' &&
          ((m.team_a_name === teamAName && m.team_b_name === teamBName) ||
            (m.team_a_name === teamBName && m.team_b_name === teamAName))
      ),
    [allMatches, teamAName, teamBName]
  );

  const h2hMatchIds = useMemo(() => h2hMatches.map((m) => m.id), [h2hMatches]);
  const { data: allInnings = [] } = useInningsByMatches(h2hMatchIds);
  const { data: allBallEvents = [], isLoading: eventsLoading } = useAllBallEvents(h2hMatchIds);

  const details = useMemo(
    () => computeHeadToHeadDetails(h2hMatches, teamAName, teamBName, allInnings, allBallEvents),
    [h2hMatches, teamAName, teamBName, allInnings, allBallEvents]
  );

  if (h2hMatches.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-2">No prior meetings.</p>;
  }

  if (eventsLoading && h2hMatchIds.length > 0) {
    return <Skeleton className="h-56 w-full" />;
  }

  return (
    <div className="space-y-4 py-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
        <H2HStat icon={<Swords className="w-4 h-4" />} label="Matches Played" value={String(details.matchesPlayed)} accent="text-white" />
        <H2HStat icon={<Trophy className="w-4 h-4" />} label="A Wins" value={`${details.teamAWins} · ${details.teamAWinPercentage}%`} accent="text-teal-300" />
        <H2HStat icon={<Trophy className="w-4 h-4" />} label="B Wins" value={`${details.teamBWins} · ${details.teamBWinPercentage}%`} accent="text-blue-300" />
        <H2HStat icon={<Gauge className="w-4 h-4" />} label="Win % (A/B)" value={`${details.teamAWinPercentage}% / ${details.teamBWinPercentage}%`} accent="text-white" />
        <H2HStat
          icon={<Target className="w-4 h-4" />}
          label="Average Score"
          value={details.averageScore !== null ? String(details.averageScore) : '—'}
          accent="text-emerald-300"
        />
        <H2HStat
          icon={<Timer className="w-4 h-4" />}
          label="Longest Streak"
          value={details.longestStreak ? `${details.longestStreak.teamName} · ${details.longestStreak.streak}` : '—'}
          accent="text-amber-300"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
          <span className="truncate text-teal-300">{teamAName}</span>
          <span className="shrink-0 text-slate-400 tabular-nums">{details.teamAWinPercentage}% · {details.teamAWins}W</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 animate-grow-bar transition-all duration-700"
            style={{ width: `${Math.max(details.teamAWinPercentage, details.teamAWins > 0 ? 4 : 0)}%` }}
          />
        </div>
        <div className="mt-1.5 mb-3.5 flex items-center justify-between text-[11px] font-semibold">
          <span className="truncate text-blue-300">{teamBName}</span>
          <span className="shrink-0 text-slate-400 tabular-nums">{details.teamBWinPercentage}% · {details.teamBWins}W</span>
        </div>
      </div>

      {details.highestChase && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Highest Chase</p>
          <p className="mt-0.5 text-lg font-extrabold text-white tabular-nums">
            {details.highestChase.runs} <span className="text-xs font-semibold text-slate-300">chased by</span> {details.highestChase.chaserName}
          </p>
          <p className="text-[11px] text-slate-400 tabular-nums">Target {details.highestChase.target} · {details.highestChase.overs} overs</p>
        </div>
      )}
    </div>
  );
}

function H2HStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <GlassCard variant="light" className="p-3 flex flex-col items-center justify-center min-h-[74px]">
      <span className="mb-1 text-slate-400">{icon}</span>
      <p className={`text-lg font-extrabold leading-tight tabular-nums ${accent}`}>{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 text-center">{label}</p>
    </GlassCard>
  );
}
