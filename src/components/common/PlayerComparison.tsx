import { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from 'recharts';
import { GlassCard } from './GlassCard';
import { Skeleton } from './Skeleton';
import { usePlayerComparison } from '../../hooks/usePlayerComparison';
import { Swords, Users, Trophy, Crown, Link2, TrendingUp, Medal } from 'lucide-react';

const BAR_A_COLOR = 'bg-teal-400';
const BAR_B_COLOR = 'bg-violet-400';
const BAR_A_GLOW = 'shadow-[0_0_12px_rgba(45,212,191,0.55)]';
const BAR_B_GLOW = 'shadow-[0_0_12px_rgba(167,139,250,0.55)]';

function shortName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 10 ? `${first.slice(0, 10)}…` : first;
}

export function PlayerComparison({ playerAId, playerBId, playerAName, playerBName }: {
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
}) {
  const comparison = usePlayerComparison(playerAId, playerBId);
  const nameA = shortName(playerAName);
  const nameB = shortName(playerBName);

  const radarData = useMemo(() => comparison?.data.radar ?? [], [comparison]);
  const stats = comparison?.data.stats ?? [];
  const headToHead = comparison?.data.headToHead ?? null;
  const achievements = comparison?.data.achievements ?? [];

  if (comparison?.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!comparison) {
    return <p className="text-center text-sm text-slate-400 py-6">Select two players to compare.</p>;
  }

  const maxFor = (s: { numericA: number | null; numericB: number | null }): number =>
    Math.max(s.numericA ?? 0, s.numericB ?? 0, 1);

  return (
    <div className="space-y-4">
      {/* Head to head */}
      {headToHead ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CompareTile icon={<Users className="w-4 h-4" />} label="Matches Together" value={String(headToHead.matchesTogether)} />
          <CompareTile icon={<Trophy className="w-4 h-4" />} label="Wins Together" value={String(headToHead.winsTogether)} />
          <CompareTile icon={<Swords className="w-4 h-4" />} label="Shared POTM" value={String(headToHead.eitherPotm)} />
          <CompareTile
            icon={<Link2 className="w-4 h-4" />}
            label="Best Partnership"
            value={headToHead.highestPartnership ? `${headToHead.highestPartnership.runs} (${headToHead.highestPartnership.balls}b)` : '—'}
          />
        </div>
      ) : (
        <p className="text-center text-sm text-slate-400 py-2">No head-to-head data — these players have not played together yet.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stat bars */}
        <GlassCard variant="light" premium className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20 text-white shadow-lg shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Stats Comparison</p>
          </div>

          <div className="space-y-3.5">
            {stats.map((s) => {
              const max = maxFor(s);
              const wA = s.numericA != null ? Math.max((s.numericA / max) * 100, s.numericA > 0 ? 4 : 0) : 0;
              const wB = s.numericB != null ? Math.max((s.numericB / max) * 100, s.numericB > 0 ? 4 : 0) : 0;
              const aWins = s.higher === 'a';
              const bWins = s.higher === 'b';
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className={`truncate ${aWins ? 'text-teal-300' : 'text-slate-300'}`}>
                      {nameA} <span className="tabular-nums">{s.valueA}</span>
                      {aWins && <Crown className="inline w-3 h-3 ml-1 -mt-0.5" />}
                    </span>
                    <span className={`shrink-0 truncate ${bWins ? 'text-violet-300' : 'text-slate-300'}`}>
                      <span className="tabular-nums">{s.valueB}</span> {nameB}
                      {bWins && <Crown className="inline w-3 h-3 ml-1 -mt-0.5" />}
                    </span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_A_COLOR} ${aWins ? BAR_A_GLOW : 'opacity-70'} animate-grow-bar`}
                        style={{ width: `${wA}%` }}
                      />
                    </div>
                    <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_B_COLOR} ${bWins ? BAR_B_GLOW : 'opacity-70'} animate-grow-bar`}
                        style={{ width: `${wB}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {s.label}
                    {s.invert ? ' · lower better' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Radar chart */}
        <GlassCard variant="light" premium className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/20 text-white shadow-lg shrink-0">
              <Swords className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Radar</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} tickCount={5} />
                <Radar name={playerAName} dataKey="playerA" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.3} strokeWidth={2} />
                <Radar name={playerBName} dataKey="playerB" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.3} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0b1522', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {radarData.map((r) => (
              <div key={r.subject} className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">{r.subject}</p>
                <p className="text-sm font-bold tabular-nums">
                  <span className="text-teal-300">{r.playerA}</span>
                  <span className="text-slate-600 mx-0.5">/</span>
                  <span className="text-violet-300">{r.playerB}</span>
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Achievements */}
      <GlassCard variant="light" premium className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20 text-white shadow-lg shrink-0">
            <Medal className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">Achievements</p>
        </div>
        <div className="space-y-2">
          {achievements.map((a) => (
            <div key={a.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
              <p className="text-xs font-bold text-slate-200 truncate">{a.label}</p>
              <AchievementSide playerName={nameA} unlocked={a.a} detail={a.detailA} accent="text-teal-300" />
              <AchievementSide playerName={nameB} unlocked={a.b} detail={a.detailB} accent="text-violet-300" />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function CompareTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <GlassCard variant="light" className="p-3 flex flex-col items-center justify-center min-h-[74px]">
      <span className="mb-1 text-slate-400">{icon}</span>
      <p className="text-lg font-extrabold leading-tight tabular-nums text-white">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400 text-center">{label}</p>
    </GlassCard>
  );
}

function AchievementSide({ playerName, unlocked, detail, accent }: { playerName: string; unlocked: boolean; detail: string; accent: string }) {
  return (
    <div className="text-right min-w-0">
      <p className={`text-[10px] font-bold truncate ${unlocked ? accent : 'text-slate-500'}`}>
        {unlocked ? '✔' : '✖'} {playerName}
      </p>
      <p className="text-[9px] text-slate-500 truncate">{detail}</p>
    </div>
  );
}
