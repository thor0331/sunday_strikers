import { PagePanel } from '../../components/common/PagePanel';
import { SelectField } from '../../components/forms/Field';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerDashboard } from '../../hooks/usePlayerDashboard';
import { usePlayerInningsHistory, usePlayerFormData } from '../../hooks/usePlayerDerived';
import { useState } from 'react';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { GlassCard } from '../../components/common/GlassCard';
import { Skeleton, SkeletonCard } from '../../components/common/Skeleton';
import { BarChart3, Target, Activity, Star, Trophy, TrendingUp, Zap, Shield, Swords, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PlayerComparison } from '../../components/common/PlayerComparison';

const formConfig = {
  excellent: { label: 'Excellent Form', color: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25', dot: 'bg-emerald-400' },
  average: { label: 'Average Form', color: 'bg-amber-400/10 text-amber-300 border-amber-400/25', dot: 'bg-amber-400' },
  needs_improvement: { label: 'Needs Improvement', color: 'bg-red-400/10 text-red-300 border-red-400/25', dot: 'bg-red-400' },
};

const tileStyles = {
  teal: 'border-teal-400/25 bg-teal-400/10 text-teal-300',
  sky: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  red: 'border-red-400/25 bg-red-400/10 text-red-300',
  amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  violet: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
} as const;

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent: keyof typeof tileStyles }) {
  const style = tileStyles[accent];
  return (
    <div className={`rounded-xl border p-4 text-center ${style}`}>
      <div className="w-4 h-4 mx-auto mb-1">{icon}</div>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}

function DetailCell({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-center min-w-0">
      <p className={`text-sm font-bold tabular-nums truncate ${highlight ? 'text-amber-300' : 'text-slate-100'}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
    </div>
  );
}

function SectionPanel({ title, icon, iconBg, children }: { title: string; icon: React.ReactNode; iconBg: string; children: React.ReactNode }) {
  return (
    <GlassCard variant="light" premium className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${iconBg} text-white shadow-lg shrink-0`}>{icon}</div>
        <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </GlassCard>
  );
}

function PlayerDashboard({ playerId, playerName, photoUrl, player }: {
  playerId: string;
  playerName: string;
  photoUrl: string | null;
  player: import('../../types/models').Player;
}) {
  const dashboard = usePlayerDashboard(playerId);
  const avatarViewer = useAvatarViewerStore();
  const potmCount = dashboard?.data.potmCount ?? 0;
  const statsLike = dashboard?.data.statsLike;
  const { formRating } = usePlayerFormData(statsLike, potmCount);
  const { data: inningsHistory = [] } = usePlayerInningsHistory(playerId);
  const form = formConfig[formRating];

  const batting = dashboard?.data.batting ?? null;
  const bowling = dashboard?.data.bowling ?? null;
  const fielding = dashboard?.data.fielding ?? null;
  const matchesPlayed = dashboard?.data.matchesPlayed ?? 0;
  const recentMatches = dashboard?.data.recentMatches ?? [];

  if (dashboard?.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-[18px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Player Header */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <CircularAvatar
            src={photoUrl}
            alt={playerName}
            size="xl"
            onClick={photoUrl ? () => avatarViewer.open(photoUrl, playerName) : undefined}
          />
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-100">{playerName}</h2>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold mt-1 ${form.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${form.dot}`} />
              {statsLike && statsLike.matches_played > 0 ? form.label : 'No Stats'}
            </span>
            {(player.batting_style || player.bowling_style) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {player.batting_style && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold text-teal-300 border border-teal-400/25">
                    🏏 {player.batting_style}
                  </span>
                )}
                {player.bowling_style && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-300 border border-red-400/25">
                    🎯 {player.bowling_style}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <StatTile icon={<BarChart3 className="w-4 h-4" />} label="Matches" value={matchesPlayed} accent="teal" />
        <StatTile icon={<Target className="w-4 h-4" />} label="Runs" value={batting?.runs ?? 0} accent="sky" />
        <StatTile icon={<Activity className="w-4 h-4" />} label="Wickets" value={bowling?.wickets ?? 0} accent="red" />
        <StatTile icon={<Star className="w-4 h-4" />} label="POTM" value={potmCount} accent="amber" />
        <StatTile icon={<Trophy className="w-4 h-4" />} label="Win %" value={`${dashboard?.data.winPct ?? 0}%`} accent="emerald" />
        <StatTile icon={<Sparkles className="w-4 h-4" />} label="Availability" value={`${dashboard?.data.availabilityPct ?? 0}%`} accent="violet" />
      </div>

      {/* Batting */}
      <SectionPanel title="Batting" icon={<Zap className="w-4 h-4" />} iconBg="bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20">
        {batting ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            <DetailCell label="Innings" value={batting.innings} />
            <DetailCell label="Runs" value={batting.runs} highlight />
            <DetailCell label="Balls" value={batting.ballsFaced} />
            <DetailCell label="Average" value={batting.average} />
            <DetailCell label="Strike Rate" value={batting.strikeRate} />
            <DetailCell label="Highest" value={batting.highestScore} highlight />
            <DetailCell label="4s" value={batting.fours} />
            <DetailCell label="6s" value={batting.sixes} />
            <DetailCell label="50s" value={batting.fifties} />
            <DetailCell label="100s" value={batting.hundreds} />
            <DetailCell label="Not Outs" value={batting.notOuts} />
            <DetailCell label="Outs" value={batting.outs} />
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 py-4">No batting statistics yet — play a match to start tracking.</p>
        )}
      </SectionPanel>

      {/* Bowling */}
      <SectionPanel title="Bowling" icon={<Shield className="w-4 h-4" />} iconBg="bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/20">
        {bowling ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            <DetailCell label="Innings" value={bowling.innings} />
            <DetailCell label="Overs" value={bowling.oversDisplay} />
            <DetailCell label="Balls" value={bowling.ballsBowled} />
            <DetailCell label="Wickets" value={bowling.wickets} highlight />
            <DetailCell label="Runs" value={bowling.runsConceded} />
            <DetailCell label="Economy" value={bowling.economy} />
            <DetailCell label="Best" value={`${bowling.bestBowlingWickets}/${bowling.bestBowlingRuns}`} highlight />
            <DetailCell label="Maidens" value={bowling.maidens} />
            <DetailCell label="Average" value={bowling.average ?? '—'} />
            <DetailCell label="Strike Rate" value={bowling.strikeRate ?? '—'} />
            <DetailCell label="Dot Balls" value={bowling.dotBalls} />
            <DetailCell label="Matches" value={bowling.matches} />
          </div>
        ) : (
          <p className="text-center text-sm text-slate-400 py-4">No bowling statistics yet — bowl to start tracking.</p>
        )}
      </SectionPanel>

      {/* Fielding */}
      <SectionPanel title="Fielding" icon={<TrendingUp className="w-4 h-4" />} iconBg="bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/20">
        <div className="grid grid-cols-3 gap-2">
          <DetailCell label="Catches" value={fielding?.catches ?? 0} />
          <DetailCell label="Run Outs" value={fielding?.runOuts ?? 0} />
          <DetailCell label="Stumpings" value={fielding?.stumpings ?? 0} />
        </div>
      </SectionPanel>

      {/* Attendance */}
      <GlassCard variant="light" premium className="p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Availability</p>
          <span className="text-sm font-bold text-violet-300 tabular-nums">
            {dashboard?.data.availabilityPct ?? 0}% <span className="text-slate-500 font-medium">({dashboard?.data.availabilityLabel})</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${dashboard?.data.availabilityPct ?? 0}%` }} />
        </div>
      </GlassCard>

      {/* Recent Form */}
      {inningsHistory.length > 0 && (
        <PagePanel title="Recent Form">
          <div className="flex gap-1.5 flex-wrap">
            {inningsHistory.map((inning, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className={`text-sm font-bold px-2.5 py-1.5 rounded ${inning.isOut ? 'bg-red-400/10 text-red-300' : 'bg-teal-400/10 text-teal-300'}`}>
                  {inning.runs}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">{inning.balls}b</span>
                <span className="text-[8px] text-slate-400 mt-0.5 truncate max-w-12">{inning.matchName.slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </PagePanel>
      )}

      {/* Recent Matches */}
      <PagePanel title="Recent Matches">
        <div className="space-y-2">
          {recentMatches.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">No completed matches for this player yet.</p>
          ) : (
            recentMatches.map(m => (
              <Link key={m.id} to={`/matches/${m.id}`} className="block rounded-lg border border-white/10 p-3 hover:border-teal-400/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{m.name}</p>
                    <p className="text-[11px] text-slate-400">{m.date}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-teal-300 truncate max-w-[140px] text-right">{m.result}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </PagePanel>
    </div>
  );
}

function PlayerComparisonBlock({ player, otherPlayers }: {
  player: import('../../types/models').Player;
  otherPlayers: import('../../types/models').Player[];
}) {
  const [comparisonId, setComparisonId] = useState(otherPlayers[0]?.id ?? '');
  const comparisonPlayer = otherPlayers.find((p) => p.id === comparisonId) ?? otherPlayers[0];

  return (
    <div className="space-y-4">
      <PagePanel title="Player Comparison">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Swords className="w-3 h-3" /> Player A
            </p>
            <p className="text-sm font-bold text-slate-100 truncate">{player.display_name}</p>
          </div>
          <SelectField
            label="Compare With"
            value={comparisonPlayer?.id ?? ''}
            onChange={e => setComparisonId(e.target.value)}
          >
            {otherPlayers.map(p => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </SelectField>
        </div>
      </PagePanel>
      {comparisonPlayer && (
        <PlayerComparison
          playerAId={player.id}
          playerBId={comparisonPlayer.id}
          playerAName={player.display_name}
          playerBName={comparisonPlayer.display_name}
        />
      )}
    </div>
  );
}

export function MyDashboardPage() {
  const { data: players = [] } = usePlayers();
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  return (
    <div className="space-y-4">
      <PagePanel title="My Dashboard">
        <div className="mb-4">
          <SelectField
            label="Select Player"
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
          >
            <option value="">Choose a player</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </SelectField>
        </div>
        {!selectedPlayerId && (
          <p className="text-center text-slate-400 py-8 text-sm">Select a player to view their dashboard.</p>
        )}
      </PagePanel>

      {selectedPlayer && (
        <>
          <PlayerDashboard
            playerId={selectedPlayer.id}
            playerName={selectedPlayer.display_name}
            photoUrl={selectedPlayer.photo_url}
            player={selectedPlayer}
          />
          <PlayerComparisonBlock player={selectedPlayer} otherPlayers={players.filter(p => p.id !== selectedPlayer.id)} />
        </>
      )}
    </div>
  );
}
