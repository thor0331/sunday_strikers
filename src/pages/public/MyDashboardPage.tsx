import { PagePanel } from '../../components/common/PagePanel';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useParentMatches } from '../../hooks/useMatches';
import { useMatchAvailability, useAvailabilityMatches } from '../../hooks/useAvailability';
import { usePotmCount, usePlayerFormData, usePlayerInningsHistory } from '../../hooks/usePlayerDerived';
import { useMemo, useState } from 'react';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { computeAttendanceRate } from '../../utils/analytics';
import { BarChart3, Trophy, Target, Star, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

const formConfig = {
  excellent: { label: 'Excellent Form', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  average: { label: 'Average Form', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  needs_improvement: { label: 'Needs Improvement', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-400' },
};

function PlayerDashboard({ playerId, playerName, photoUrl }: { playerId: string; playerName: string; photoUrl: string | null }) {
  const { data: allStats = [] } = usePlayerStatistics();
  const { data: matches = [] } = useParentMatches();
  const { data: availabilityMatches = [] } = useAvailabilityMatches();
  const { data: availability = [] } = useMatchAvailability(availabilityMatches.length > 0 ? availabilityMatches[0].id : null);
  const avatarViewer = useAvatarViewerStore();

  const stats = allStats.find(s => s.player_id === playerId);
  const potmCounts = usePotmCount();
  const potmCount = potmCounts[playerId] ?? 0;
  const { formRating } = usePlayerFormData(stats, potmCount);
  const { data: inningsHistory = [] } = usePlayerInningsHistory(playerId);
  const form = formConfig[formRating];

  const totalMatches = matches.filter(m => m.status === 'completed').length;
  const availabilityCount = availability.filter(a => a.status === 'available').length;
  const attendancePct = computeAttendanceRate(
    availabilityMatches.filter(m => m.status === 'completed').length || 1,
    availabilityCount
  );

  const recentMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'completed')
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        name: m.match_name,
        date: m.match_date,
        result: m.result_text ?? '',
      }));
  }, [matches]);

  return (
    <div className="space-y-4">
      {/* Player Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <CircularAvatar
            src={photoUrl}
            alt={playerName}
            size="xl"
            onClick={photoUrl ? () => avatarViewer.open(photoUrl, playerName) : undefined}
          />
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-800">{playerName}</h2>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold mt-1 ${form.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${form.dot}`} />
              {stats ? form.label : 'No Stats'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 text-center">
          <BarChart3 className="w-4 h-4 text-teal-500 mx-auto mb-1" />
          <p className="text-2xl font-extrabold text-teal-700">{stats?.matches_played ?? 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Matches</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 text-center">
          <Target className="w-4 h-4 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-extrabold text-blue-700">{stats?.runs ?? 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Runs</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4 text-center">
          <Activity className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-extrabold text-red-700">{stats?.wickets ?? 0}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Wickets</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 text-center">
          <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-extrabold text-amber-700">{potmCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">POTM</p>
        </div>
      </div>

      {/* Attendance */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Availability</p>
          <span className="text-sm font-bold text-teal-600">{attendancePct}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${attendancePct}%` }} />
        </div>
      </div>

      {/* Recent Form */}
      {inningsHistory.length > 0 && (
        <PagePanel title="Recent Form">
          <div className="flex gap-1.5 flex-wrap">
            {inningsHistory.map((inning, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className={`text-sm font-bold px-2.5 py-1.5 rounded ${inning.isOut ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-600'}`}>
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
          {recentMatches.map(m => (
            <Link key={m.id} to={`/matches/${m.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-teal-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{m.name}</p>
                  <p className="text-[11px] text-slate-500">{m.date}</p>
                </div>
                <span className="text-[11px] font-semibold text-teal-600 truncate max-w-[140px] text-right">{m.result}</span>
              </div>
            </Link>
          ))}
        </div>
      </PagePanel>
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
          <label className="text-xs font-semibold text-slate-600 mb-1 block">Select Player</label>
          <select
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="">Choose a player</option>
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </select>
        </div>
        {!selectedPlayerId && (
          <p className="text-center text-slate-400 py-8 text-sm">Select a player to view their dashboard.</p>
        )}
      </PagePanel>

      {selectedPlayer && (
        <PlayerDashboard
          playerId={selectedPlayer.id}
          playerName={selectedPlayer.display_name}
          photoUrl={selectedPlayer.photo_url}
        />
      )}
    </div>
  );
}
