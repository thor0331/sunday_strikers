import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { SelectField, TextField } from '../../components/forms/Field';
import { MutationStatus } from '../../components/forms/MutationStatus';
import { useAvailabilityMatches, useMatchAvailability, useSetAvailability, useAllAvailability } from '../../hooks/useAvailability';
import { useParentMatches } from '../../hooks/useMatches';
import { usePlayers } from '../../hooks/usePlayers';
import type { AvailabilityStatus } from '../../types/models';
import { useMemo, useState, type FormEvent } from 'react';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { computeAttendanceRate } from '../../utils/analytics';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { TrendingUp, TrendingDown, Minus, Flame } from 'lucide-react';
import { Skeleton } from '../../components/common/Skeleton';

export function AvailabilityPage() {
  const { data: matches = [], isLoading: matchesLoading } = useAvailabilityMatches();
  const { data: allMatches = [] } = useParentMatches();
  const { data: players = [] } = usePlayers();
  const { data: allAvailability = [] } = useAllAvailability();
  const avatarViewer = useAvatarViewerStore();
  const [matchId, setMatchId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [status, setStatus] = useState<AvailabilityStatus>('available');
  const [note, setNote] = useState('');
  const { data: availability = [] } = useMatchAvailability(matchId || null);
  const setAvailability = useSetAvailability();

  const activePlayers = useMemo(() => players.filter((player) => player.status === 'active'), [players]);
  const availabilityByPlayer = useMemo(() => new Map(availability.map((item) => [item.player_id, item])), [availability]);

  // All availability indexed by match_id for fast lookup
  const allAvailabilityByMatch = useMemo(() => {
    const map = new Map<string, Map<string, { status: AvailabilityStatus; note: string | null }>>();
    for (const item of allAvailability) {
      if (!map.has(item.match_id)) map.set(item.match_id, new Map());
      map.get(item.match_id)!.set(item.player_id, { status: item.status, note: item.note });
    }
    return map;
  }, [allAvailability]);

  const sortedMatches = useMemo(() => [...allMatches].filter(m => m.status === 'completed').sort((a, b) => a.match_date.localeCompare(b.match_date)), [allMatches]);

  // Compute availability leaderboard across all matches
  const leaderboard = useMemo(() => {
    const completedMatches = sortedMatches;
    if (completedMatches.length === 0) return [];
    const playerScores: {
      playerId: string; name: string; photo: string | null; total: number; available: number; pct: number;
      streak: number; recentPct: number; prevPct: number; trend: 'up' | 'down' | 'stable';
    }[] = [];
    for (const player of activePlayers) {
      let available = 0;
      let total = 0;
      let streak = 0;
      const recentAvail: boolean[] = [];
      for (const match of completedMatches) {
        const av = allAvailabilityByMatch.get(match.id)?.get(player.id);
        if (av) {
          total++;
          if (av.status === 'available') { available++; streak++; } else { streak = 0; }
          recentAvail.push(av.status === 'available');
        }
      }
      if (total > 0) {
        const recent5 = recentAvail.slice(-5);
        const prev5 = recentAvail.slice(-10, -5);
        const recentPct = recent5.length > 0 ? Math.round((recent5.filter(Boolean).length / recent5.length) * 100) : 0;
        const prevPct = prev5.length > 0 ? Math.round((prev5.filter(Boolean).length / prev5.length) * 100) : 0;
        const trend = recentPct > prevPct ? 'up' : recentPct < prevPct ? 'down' : 'stable';
        playerScores.push({
          playerId: player.id,
          name: player.display_name,
          photo: player.photo_url,
          total,
          available,
          pct: computeAttendanceRate(total, available),
          streak,
          recentPct,
          prevPct,
          trend,
        });
      }
    }
    return playerScores.sort((a, b) => b.pct - a.pct).slice(0, 10);
  }, [sortedMatches, activePlayers, allAvailabilityByMatch]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await setAvailability.mutateAsync({ matchId, playerId, status, note });
    setNote('');
  }

  return (
    <div className="space-y-4">
      <PagePanel title="Availability">
        <form className="grid gap-3" onSubmit={submit}>
          <SelectField label="Match" value={matchId} onChange={(event) => setMatchId(event.target.value)} required>
            <option value="">Select match</option>
            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.match_name} - {match.match_date}
              </option>
            ))}
          </SelectField>
          <SelectField label="Player" value={playerId} onChange={(event) => setPlayerId(event.target.value)} required>
            <option value="">Select player</option>
            {activePlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.display_name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as AvailabilityStatus)}>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="maybe">Maybe</option>
          </SelectField>
          <TextField label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button disabled={!matchId || !playerId || setAvailability.isPending}>Mark Availability</Button>
          <MutationStatus error={setAvailability.error} success={setAvailability.isSuccess ? 'Availability saved.' : null} />
        </form>
      </PagePanel>

      <PagePanel title="Match Availability">
        {matchesLoading ? <Skeleton className="h-24 w-full rounded-[18px]" /> : null}
        {!matchId ? <p className="text-slate-300">Select a match to see player availability.</p> : null}
        {matchId ? (
          <>
            <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Attendance</p>
                  <p className="mt-0.5 text-2xl font-extrabold text-white">
                    {availability.filter(a => a.status === 'available').length}
                    <span className="text-sm font-semibold text-slate-300"> / {activePlayers.length} players</span>
                  </p>
                </div>
                <div className={`text-lg font-bold ${availability.length > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {availability.length > 0 ? Math.round(availability.filter(a => a.status === 'available').length / activePlayers.length * 100) : 0}%
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${activePlayers.length > 0 ? (availability.filter(a => a.status === 'available').length / activePlayers.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="grid gap-1.5">
              {activePlayers.map((player) => {
                const item = availabilityByPlayer.get(player.id);
                const statusColor = item?.status === 'available' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : item?.status === 'maybe' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : item?.status === 'unavailable' ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-white/5 text-slate-400 border-white/10';
                const statusDot = item?.status === 'available' ? 'bg-emerald-400' : item?.status === 'maybe' ? 'bg-amber-400' : item?.status === 'unavailable' ? 'bg-red-400' : 'bg-white/25';
                return (
                  <div key={player.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                    <CircularAvatar src={player.photo_url} alt={player.display_name} size="sm" onClick={player.photo_url ? () => avatarViewer.open(player.photo_url!, player.display_name) : undefined} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{player.display_name}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusColor}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                      {item?.status ?? 'not marked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </PagePanel>

      {/* Availability Leaderboard */}
      {leaderboard.length > 0 && (
        <PagePanel title="Availability Leaderboard">
          <p className="-mt-2 mb-3 text-[10px] text-slate-400">Top 10 players by attendance rate</p>
          <div className="space-y-2">
            {leaderboard.map((entry, i) => {
              const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
              return (
                <div key={entry.playerId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-emerald-400/40">
                  <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-300">{rankIcon}</span>
                  <CircularAvatar src={entry.photo} alt={entry.name} size="sm" onClick={entry.photo ? () => avatarViewer.open(entry.photo!, entry.name) : undefined} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{entry.name}</p>
                    <p className="text-[10px] text-slate-400">{entry.available}/{entry.total} matches</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {entry.streak >= 3 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-400">
                          <Flame className="h-3 w-3" />{entry.streak}
                        </span>
                      )}
                      {entry.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
                      {entry.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                      {entry.trend === 'stable' && <Minus className="h-3 w-3 text-slate-400" />}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-400">{entry.pct}%</p>
                    <div className="ml-auto mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-emerald-400" style={{ width: `${entry.pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </PagePanel>
      )}
    </div>
  );
}
