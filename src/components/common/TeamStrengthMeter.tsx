import { useMemo } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { Gauge, Info } from 'lucide-react';
import type { Availability, BallEvent, Match, MatchPlayer } from '../../types/models';
import { computeTeamStrengths, type TeamStrengthCategory } from '../../utils/teamStrength';

interface TeamStrengthMeterProps {
  teamAName: string;
  teamBName: string;
  matches: Match[];
  ballEvents: BallEvent[];
  matchPlayers: MatchPlayer[];
  currentMatchPlayers: MatchPlayer[];
  availability: Availability[];
  currentMatchId: string;
  playersPerTeam: number;
}

type CategoryKey = 'batting' | 'bowling' | 'fielding' | 'availability' | 'recentForm';

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
  { key: 'fielding', label: 'Fielding' },
  { key: 'availability', label: 'Availability' },
  { key: 'recentForm', label: 'Recent Form' },
];

function TeamBar({
  name,
  category,
  accent,
  index,
}: {
  name: string;
  category: TeamStrengthCategory;
  accent: 'teal' | 'sky';
  index: number;
}) {
  const gradient = accent === 'teal' ? 'bg-gradient-to-r from-teal-500 to-teal-400' : 'bg-gradient-to-r from-sky-500 to-sky-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 shrink-0">
        <p className="truncate text-xs font-semibold text-slate-200" title={name}>
          {name}
        </p>
        <p className="truncate text-[9px] text-slate-500" title={category.detail}>
          {category.detail || '\u00A0'}
        </p>
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className={`h-full rounded-full ${gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${category.score}%` }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.05 * index }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-slate-100">
        {category.score}
      </span>
    </div>
  );
}

/**
 * Pre-match / in-match "Team Strength" comparison meter. Purely presentational:
 * all numbers come from `computeTeamStrengths` over aggregated statistics.
 */
export function TeamStrengthMeter(props: TeamStrengthMeterProps) {
  const { teamA, teamB } = useMemo(
    () =>
      computeTeamStrengths({
        teamAName: props.teamAName,
        teamBName: props.teamBName,
        matches: props.matches,
        ballEvents: props.ballEvents,
        matchPlayers: props.matchPlayers,
        currentMatchPlayers: props.currentMatchPlayers,
        availability: props.availability,
        currentMatchId: props.currentMatchId,
        playersPerTeam: props.playersPerTeam,
      }),
    [
      props.teamAName,
      props.teamBName,
      props.matches,
      props.ballEvents,
      props.matchPlayers,
      props.currentMatchPlayers,
      props.availability,
      props.currentMatchId,
      props.playersPerTeam,
    ]
  );

  const isEmpty =
    teamA.matches === 0 && teamB.matches === 0 && teamA.availability.score === 50 && teamB.availability.score === 50;

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm text-slate-400">
        Not enough match data to compare team strength yet.
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4">
        {/* Overall score */}
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Strength</p>
            <Gauge className="h-4 w-4 text-teal-400/70" />
          </div>
          <div className="mb-2 flex items-end justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-teal-300">{teamA.name}</p>
              <p className="text-2xl font-extrabold tabular-nums text-teal-200">{teamA.overall}</p>
            </div>
            <p className="pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">vs</p>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-bold text-sky-300">{teamB.name}</p>
              <p className="text-2xl font-extrabold tabular-nums text-sky-200">{teamB.overall}</p>
            </div>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div
              className="bg-gradient-to-r from-teal-500 to-teal-400"
              initial={{ width: 0 }}
              animate={{ width: `${teamA.overall}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            <div className="h-full flex-1 bg-gradient-to-l from-sky-500 to-sky-400" style={{ opacity: 0.85 }} />
          </div>
          <p className="mt-2 flex items-start gap-1 text-[10px] leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Based on completed matches, form and availability — an indicative comparison, not a prediction.
          </p>
        </div>

        {/* Category bars */}
        <div className="space-y-3">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <div className="space-y-1.5">
                <TeamBar name={teamA.name} category={teamA[key]} accent="teal" index={1} />
                <TeamBar name={teamB.name} category={teamB[key]} accent="sky" index={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </MotionConfig>
  );
}
