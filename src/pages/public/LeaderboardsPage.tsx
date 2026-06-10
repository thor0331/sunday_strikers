import { PagePanel } from '../../components/common/PagePanel';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useParentMatches } from '../../hooks/useMatches';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { GlassCard } from '../../components/common/GlassCard';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { Trophy, Target, Eye, Award, Medal, Zap } from 'lucide-react';

type Tab = 'batting' | 'bowling' | 'fielding' | 'potm';

const tabConfig: { key: Tab; label: string; shortLabel: string; color: string; borderColor: string }[] = [
  { key: 'batting', label: 'Batting', shortLabel: 'Bat', color: 'text-teal-600', borderColor: 'border-teal-500' },
  { key: 'bowling', label: 'Bowling', shortLabel: 'Bowl', color: 'text-red-600', borderColor: 'border-red-500' },
  { key: 'fielding', label: 'Fielding', shortLabel: 'Field', color: 'text-blue-600', borderColor: 'border-blue-500' },
  { key: 'potm', label: 'Player of Match', shortLabel: 'POTM', color: 'text-amber-600', borderColor: 'border-amber-500' },
];

const medals = [
  { emoji: '🥇', label: 'Gold', color: 'text-yellow-500' },
  { emoji: '🥈', label: 'Silver', color: 'text-slate-400' },
  { emoji: '🥉', label: 'Bronze', color: 'text-amber-700' },
];

function getMedal(index: number) {
  return index < 3 ? medals[index] : null;
}

export function LeaderboardsPage() {
  const { data: statistics = [], isLoading, error } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();
  const { data: allMatches = [] } = useParentMatches();
  const playerNames = useMemo(() => new Map(players.map((player) => [player.id, player.display_name])), [players]);
  const playerPhotos = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);
  const avatarViewer = useAvatarViewerStore();
  const [activeTab, setActiveTab] = useState<Tab>('batting');

  const potmCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const completedMatches = allMatches.filter(m => m.status === 'completed' && m.player_of_match_id);
    for (const match of completedMatches) {
      if (match.player_of_match_id) {
        counts.set(match.player_of_match_id, (counts.get(match.player_of_match_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [allMatches]);

  const potmLeaderboard = useMemo(() => {
    return statistics
      .filter(s => (potmCounts.get(s.player_id) ?? 0) > 0)
      .map(s => ({
        ...s,
        potmCount: potmCounts.get(s.player_id) ?? 0,
        playerName: playerNames.get(s.player_id) ?? 'Player'
      }))
      .sort((a, b) => b.potmCount - a.potmCount || b.runs - a.runs);
  }, [statistics, potmCounts, playerNames]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-slate-500 font-medium animate-pulse">Loading leaderboards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 text-red-700">
        <p className="font-semibold">Error</p>
        <p className="text-sm">Unable to load leaderboards.</p>
      </div>
    );
  }

  const battingStats = statistics
    .filter((s) => s.batting_innings > 0)
    .map((s) => ({
      ...s,
      average: s.outs > 0 ? Number((s.runs / s.outs).toFixed(2)) : s.runs,
      strikeRate: s.balls_faced > 0 ? Number((s.runs / s.balls_faced * 100).toFixed(2)) : 0,
      playerName: playerNames.get(s.player_id) ?? 'Player'
    }))
    .sort((a, b) => b.runs - a.runs);

  const bowlingStats = statistics
    .filter((s) => s.bowling_innings > 0)
    .map((s) => ({
      ...s,
      economy: s.balls_bowled > 0 ? Number((s.runs_conceded / s.balls_bowled * 6).toFixed(2)) : 0,
      oversDisplay: `${Math.floor(s.balls_bowled / 6)}.${s.balls_bowled % 6}`,
      playerName: playerNames.get(s.player_id) ?? 'Player'
    }))
    .sort((a, b) => b.wickets - a.wickets);

  const fieldingStats = statistics
    .filter((s) => s.catches > 0 || s.run_outs > 0 || s.stumpings > 0)
    .map((s) => ({
      ...s,
      totalDismissals: s.catches + s.run_outs + s.stumpings,
      playerName: playerNames.get(s.player_id) ?? 'Player'
    }))
    .sort((a, b) => b.totalDismissals - a.totalDismissals);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h1 className="text-xl font-bold text-slate-800">Leaderboards</h1>
        </div>
        <Link to="/hall-of-fame" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg hover:from-amber-500 hover:to-amber-600 transition-all btn-press">
          🏅 Hall of Fame
        </Link>
      </div>

      {/* Animated Tabs */}
      <div className="flex border-b border-slate-200 -mx-4 px-4 overflow-x-auto">
        {tabConfig.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-underline shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? `active ${tab.color}`
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'batting' && (
        <PagePanel title="Batting Leaderboard">
          <LeaderboardList
            data={battingStats}
            primaryKey="runs"
            primaryLabel="Runs"
            primaryColor="teal"
            secondaryKeys={[
              { key: 'average', label: 'Avg', color: 'slate' },
              { key: 'strikeRate', label: 'SR', color: 'slate' },
              { key: 'fours', label: '4s', color: 'slate' },
              { key: 'sixes', label: '6s', color: 'slate' },
            ]}
            emptyIcon="🏏"
            emptyTitle="No batting stats yet"
            playerPhotos={playerPhotos}
            avatarViewer={avatarViewer}
          />
        </PagePanel>
      )}

      {activeTab === 'bowling' && (
        <PagePanel title="Bowling Leaderboard">
          <LeaderboardList
            data={bowlingStats}
            primaryKey="wickets"
            primaryLabel="Wkts"
            primaryColor="red"
            secondaryKeys={[
              { key: 'oversDisplay', label: 'Ov', color: 'slate' },
              { key: 'runs_conceded', label: 'Runs', color: 'slate' },
              { key: 'economy', label: 'Eco', color: 'slate' },
              { key: 'maidens', label: 'M', color: 'slate' },
            ]}
            emptyIcon="🎯"
            emptyTitle="No bowling stats yet"
            playerPhotos={playerPhotos}
            avatarViewer={avatarViewer}
          />
        </PagePanel>
      )}

      {activeTab === 'fielding' && (
        <PagePanel title="Fielding Leaderboard">
          <LeaderboardList
            data={fieldingStats}
            primaryKey="totalDismissals"
            primaryLabel="Total"
            primaryColor="blue"
            secondaryKeys={[
              { key: 'catches', label: 'Ct', color: 'slate' },
              { key: 'run_outs', label: 'RO', color: 'slate' },
              { key: 'stumpings', label: 'St', color: 'slate' },
            ]}
            emptyIcon="🧤"
            emptyTitle="No fielding stats yet"
            playerPhotos={playerPhotos}
            avatarViewer={avatarViewer}
          />
        </PagePanel>
      )}

      {activeTab === 'potm' && (
        <PagePanel title="Player of the Match">
          <LeaderboardList
            data={potmLeaderboard}
            primaryKey="potmCount"
            primaryLabel="POTM"
            primaryColor="amber"
            secondaryKeys={[
              { key: 'matches_played', label: 'Pld', color: 'slate' },
              { key: 'runs', label: 'Runs', color: 'slate' },
              { key: 'wickets', label: 'Wkts', color: 'slate' },
            ]}
            emptyIcon="🏆"
            emptyTitle="No POTM awards yet"
            playerPhotos={playerPhotos}
            avatarViewer={avatarViewer}
          />
        </PagePanel>
      )}
    </div>
  );
}

interface LeaderboardEntry {
  playerName: string;
  player_id: string;
  [key: string]: unknown;
}

interface LeaderboardListProps {
  data: LeaderboardEntry[];
  primaryKey: string;
  primaryLabel: string;
  primaryColor: string;
  secondaryKeys: { key: string; label: string; color: string }[];
  emptyIcon: string;
  emptyTitle: string;
  playerPhotos: Map<string, string | null>;
  avatarViewer: { open: (url: string, name: string) => void };
}

function LeaderboardList({ data, primaryKey, primaryLabel, primaryColor, secondaryKeys, emptyIcon, emptyTitle, playerPhotos, avatarViewer }: LeaderboardListProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <div className="text-5xl mb-4 opacity-60">{emptyIcon}</div>
        <p className="text-base font-bold text-slate-600">{emptyTitle}</p>
        <p className="text-sm text-slate-400 mt-1">Stats will appear after matches are played.</p>
      </div>
    );
  }

  const colorMap: Record<string, string> = { teal: 'text-teal-600', red: 'text-red-600', blue: 'text-blue-600', amber: 'text-amber-600' };
  const primaryTextColor = colorMap[primaryColor] ?? 'text-teal-600';

  return (
    <div className="space-y-2 stagger-enter">
      {data.slice(0, 50).map((entry, index) => {
        const medal = getMedal(index);
        return (
          <GlassCard
            key={entry.player_id}
            variant="light"
            hover={index >= 3}
            className={`px-3 py-2.5 sm:px-4 sm:py-3 ${index < 3 ? '!bg-white !border-0' : ''}`}
            glow={index === 0 ? 'teal' : 'none'}
          >
            <div className="flex items-center gap-2.5">
              {/* Rank */}
              <div className="w-7 text-center shrink-0">
                {medal ? (
                  <span className="text-lg" title={medal.label}>{medal.emoji}</span>
                ) : (
                  <span className="text-xs font-bold text-slate-400 tabular-nums">{index + 1}</span>
                )}
              </div>

              {/* Player photo + name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CircularAvatar
                  src={playerPhotos.get(entry.player_id)}
                  alt={entry.playerName}
                  size="sm"
                  onClick={
                    playerPhotos.get(entry.player_id)
                      ? () => avatarViewer.open(playerPhotos.get(entry.player_id)!, entry.playerName)
                      : undefined
                  }
                />
                <span className="text-sm font-bold text-slate-800 truncate">{entry.playerName}</span>
              </div>

              {/* Primary stat */}
              <div className="text-right min-w-[3rem] shrink-0">
                <p className={`text-sm font-extrabold ${primaryTextColor} tabular-nums`}>
                  {String(entry[primaryKey] ?? 0)}
                </p>
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{primaryLabel}</p>
              </div>

              {/* Secondary stats (hidden on mobile) */}
              <div className="hidden sm:flex items-center gap-3 ml-2 shrink-0">
                {secondaryKeys.map(sk => (
                  <div key={sk.key} className="text-center min-w-[2rem]">
                    <p className="text-[11px] font-semibold text-slate-600 tabular-nums">
                      {String(entry[sk.key] ?? 0)}
                    </p>
                    <p className="text-[8px] text-slate-400 uppercase tracking-wider">{sk.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
