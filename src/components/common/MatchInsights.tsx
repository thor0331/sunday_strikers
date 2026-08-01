import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { BallEvent, DerivedInningsState, Match } from '../../types/models';
import { GlassCard } from './GlassCard';
import { WormGraph } from './WormGraph';
import {
  computeRunDistribution,
  computeHighestPartnership,
  computeDismissalTypes,
  computeBestBowlingSpell,
  computeMostExpensiveOver,
} from '../../utils/matchAnalytics';
import { Link2, Activity, Gauge, Zap, TrendingDown, Minus } from 'lucide-react';

interface MatchInsightsProps {
  match: Match;
  ballEvents1: BallEvent[];
  ballEvents2: BallEvent[];
  innings1Stats: DerivedInningsState | null;
  innings2Stats: DerivedInningsState | null;
  playerMap: Map<string, string>;
}

interface InningsInsight {
  title: string;
  runs: number;
  wickets: number;
  overs: string;
  boundaryPct: number;
  dotPct: number;
  boundaries: number;
  dots: number;
  partnership: { runs: number; balls: number; b1: string; b2: string } | null;
  bestSpell: { bowlerId: string; wickets: number; runsConceded: number; overs: string } | null;
  expensiveOver: { over: number; runs: number } | null;
  dismissals: { type: string; count: number }[];
}

function buildInningsInsight(events: BallEvent[], stats: DerivedInningsState | null, playerMap: Map<string, string>): InningsInsight {
  const dist = computeRunDistribution(events);
  const partnership = computeHighestPartnership(events);
  const spell = computeBestBowlingSpell(events);
  const expensive = computeMostExpensiveOver(events);

  return {
    title: stats ? `${stats.totalRuns}/${stats.wickets}` : '—',
    runs: stats?.totalRuns ?? dist.totalRuns,
    wickets: stats?.wickets ?? 0,
    overs: stats?.oversDisplay ?? '',
    boundaryPct: dist.boundaryRunPct,
    dotPct: dist.dotBallPct,
    boundaries: dist.boundaries,
    dots: dist.dots,
    partnership: partnership
      ? {
          runs: partnership.runs,
          balls: partnership.balls,
          b1: playerMap.get(partnership.b1) ?? 'Batter',
          b2: playerMap.get(partnership.b2) ?? 'Batter'
        }
      : null,
    bestSpell: spell
      ? {
          bowlerId: playerMap.get(spell.bowlerId) ?? 'Bowler',
          wickets: spell.wickets,
          runsConceded: spell.runsConceded,
          overs: formatOversFromBalls(spell.balls)
        }
      : null,
    expensiveOver: expensive ? { over: expensive.over, runs: expensive.runs } : null,
    dismissals: computeDismissalTypes(events)
  };
}

function formatOversFromBalls(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function InsightStat({ icon, label, value, tone = 'text-slate-200' }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 min-w-0">
      <div className="shrink-0 p-1.5 rounded-lg bg-white/10 border border-white/10 text-slate-300 shadow-sm">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`text-sm font-bold truncate tabular-nums ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

export function MatchInsights({ match, ballEvents1, ballEvents2, innings1Stats, innings2Stats, playerMap }: MatchInsightsProps) {
  const innings1Name = innings1Stats && match.batting_first
    ? (match.batting_first === 'team_a' ? match.team_a_name : match.team_b_name)
    : match.team_a_name;

  const innings2Name = match.batting_first
    ? (match.batting_first === 'team_a' ? match.team_b_name : match.team_a_name)
    : match.team_b_name;

  const insight1 = useMemo(() => buildInningsInsight(ballEvents1, innings1Stats, playerMap), [ballEvents1, innings1Stats, playerMap]);
  const insight2 = useMemo(() => buildInningsInsight(ballEvents2, innings2Stats, playerMap), [ballEvents2, innings2Stats, playerMap]);

  if (ballEvents1.length === 0 && ballEvents2.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InningsInsightCard insight={insight1} teamName={innings1Name} accent="teal" />
        <InningsInsightCard insight={insight2} teamName={innings2Name} accent="violet" />
      </div>

      <WormGraph
        team1Name={innings1Name}
        team2Name={innings2Name}
        ballEvents1={ballEvents1}
        ballEvents2={ballEvents2}
        targetRuns={innings2Stats?.targetRuns ?? null}
        totalOvers={match.overs_per_innings}
        playerMap={playerMap}
      />
    </div>
  );
}

function InningsInsightCard({ insight, teamName, accent }: { insight: InningsInsight; teamName: string; accent: 'teal' | 'violet' }) {
  const accentBar = accent === 'teal' ? 'from-teal-400 to-emerald-500' : 'from-violet-400 to-purple-500';
  const accentText = accent === 'teal' ? 'text-teal-400' : 'text-violet-400';

  return (
    <GlassCard variant="light" premium className="p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${accentBar} text-white shadow-lg shrink-0`}>
            <Gauge className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider truncate">{teamName}</p>
            <p className="text-[10px] text-slate-400">{insight.runs}/{insight.wickets} in {insight.overs} overs</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-3 bg-white/[0.04] border border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Boundary %</span>
            <Zap className={`w-3.5 h-3.5 ${accentText}`} />
          </div>
          <p className={`text-xl font-extrabold tabular-nums ${accentText}`}>{insight.boundaryPct}%</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{insight.boundaries} boundaries</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${insight.boundaryPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${accentBar}`}
            />
          </div>
        </div>
        <div className="rounded-xl p-3 bg-white/[0.04] border border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Dot Balls</span>
            <Minus className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <p className="text-xl font-extrabold tabular-nums text-slate-200">{insight.dotPct}%</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{insight.dots} dots</p>
          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${insight.dotPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <InsightStat
          icon={<Link2 className="w-3.5 h-3.5" />}
          label="Best Partnership"
          value={insight.partnership ? `${insight.partnership.runs} (${insight.partnership.b1} & ${insight.partnership.b2})` : '—'}
        />
        <InsightStat
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Best Spell"
          value={insight.bestSpell ? `${insight.bestSpell.bowlerId} — ${insight.bestSpell.wickets}/${insight.bestSpell.runsConceded} (${insight.bestSpell.overs})` : '—'}
        />
        <InsightStat
          icon={<TrendingDown className="w-3.5 h-3.5" />}
          label="Most Expensive Over"
          value={insight.expensiveOver ? `Over ${insight.expensiveOver.over} — ${insight.expensiveOver.runs} runs` : '—'}
          tone="text-red-400"
        />
      </div>

      {insight.dismissals.length > 0 && (
        <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
          {insight.dismissals.map((d) => (
            <span key={d.type} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
              {d.type} <span className={`font-bold ${accentText}`}>{d.count}</span>
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
