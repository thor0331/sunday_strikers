import { PagePanel } from '../../components/common/PagePanel';
import { usePlayers } from '../../hooks/usePlayers';
import { useParentMatches } from '../../hooks/useMatches';
import { useSeasons } from '../../hooks/useSeasons';
import { useAllBallEvents } from '../../hooks/useBallEvents';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircularAvatar } from '../../components/common/CircularAvatar';
import { OrangeCapWidget, PurpleCapWidget, type CapStatRow } from '../../components/common/CapWidgets';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton, SkeletonTable } from '../../components/common/Skeleton';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';
import { SelectField } from '../../components/forms/Field';
import { Trophy, Activity, CalendarDays, Shield } from 'lucide-react';
import { aggregateBatting, aggregateBowling, aggregateFielding } from '../../utils/seasonStatistics';

const medals = [
  { emoji: '🥇', label: 'Gold' },
  { emoji: '🥈', label: 'Silver' },
  { emoji: '🥉', label: 'Bronze' },
];

function getMedal(index: number) {
  return index < 3 ? medals[index] : null;
}

export function LeaderboardsPage() {
  const { data: players = [] } = usePlayers();
  const { data: allMatches = [], isLoading: matchesLoading, error: matchesError } = useParentMatches();
  const { data: seasons = [] } = useSeasons();
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'fielding' | 'potm'>('batting');

  const playerNames = useMemo(() => new Map(players.map((player) => [player.id, player.display_name])), [players]);
  const playerPhotos = useMemo(() => new Map(players.map((p) => [p.id, p.photo_url])), [players]);
  const avatarViewer = useAvatarViewerStore();

  const seasonMatches = useMemo(() => {
    if (!selectedSeasonId) return allMatches;
    return allMatches.filter((m) => m.season_id === selectedSeasonId);
  }, [allMatches, selectedSeasonId]);

  const completedMatches = useMemo(
    () => seasonMatches.filter((m) => m.status === 'completed'),
    [seasonMatches]
  );
  const completedMatchIds = useMemo(() => completedMatches.map((m) => m.id), [completedMatches]);
  const { data: allBallEvents = [], isLoading: eventsLoading, error: eventsError } = useAllBallEvents(completedMatchIds);

  const battingStats = useMemo(() => aggregateBatting(allBallEvents), [allBallEvents]);
  const bowlingStats = useMemo(() => aggregateBowling(allBallEvents), [allBallEvents]);
  const fieldingStats = useMemo(() => aggregateFielding(allBallEvents), [allBallEvents]);

  const battingById = useMemo(() => new Map(battingStats.map((s) => [s.playerId, s])), [battingStats]);
  const bowlingById = useMemo(() => new Map(bowlingStats.map((s) => [s.playerId, s])), [bowlingStats]);
  const matchesByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of battingStats) map.set(s.playerId, Math.max(map.get(s.playerId) ?? 0, s.matches));
    for (const s of bowlingStats) map.set(s.playerId, Math.max(map.get(s.playerId) ?? 0, s.matches));
    return map;
  }, [battingStats, bowlingStats]);

  const potmCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const match of completedMatches) {
      if (match.player_of_match_id) {
        counts.set(match.player_of_match_id, (counts.get(match.player_of_match_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [completedMatches]);

  const potmLeaderboard = useMemo(() => {
    return [...potmCounts.entries()]
      .map(([playerId, potmCount]) => {
        const bat = battingById.get(playerId);
        const bowl = bowlingById.get(playerId);
        return {
          player_id: playerId,
          id: `${playerId}-potm`,
          potmCount,
          runs: bat?.runs ?? 0,
          wickets: bowl?.wickets ?? 0,
          matches_played: Math.max(bat?.matches ?? 0, bowl?.matches ?? 0),
          playerName: playerNames.get(playerId) ?? 'Player'
        };
      })
      .sort((a, b) => b.potmCount - a.potmCount || b.runs - a.runs);
  }, [potmCounts, battingById, bowlingById, playerNames]);

  const capRows = useMemo<CapStatRow[]>(() => {
    const rows: CapStatRow[] = [];
    const seen = new Set<string>();
    for (const bat of battingStats) {
      seen.add(bat.playerId);
      rows.push({ player_id: bat.playerId, runs: bat.runs, wickets: bowlingById.get(bat.playerId)?.wickets ?? 0 });
    }
    for (const bowl of bowlingStats) {
      if (!seen.has(bowl.playerId)) {
        rows.push({ player_id: bowl.playerId, runs: 0, wickets: bowl.wickets });
      }
    }
    return rows;
  }, [battingStats, bowlingStats, bowlingById]);

  const seasonTotals = useMemo(() => {
    let runs = 0;
    let wickets = 0;
    for (const event of allBallEvents) {
      runs += event.runsBatter + event.runsExtra;
      if (event.isWicket) wickets += 1;
    }
    return {
      matches: completedMatches.length,
      runs,
      wickets,
      potms: completedMatches.filter((m) => m.player_of_match_id).length,
      fours: allBallEvents.filter((e) => e.runsBatter === 4).length,
      sixes: allBallEvents.filter((e) => e.runsBatter === 6).length
    };
  }, [completedMatches, allBallEvents]);

  if (matchesLoading || eventsLoading) {
    return (
    <div className="space-y-6 page-container mx-auto w-full px-4 md:px-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-12 w-full max-w-xs" />
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  if (matchesError || eventsError) {
    return (
      <div className="p-4 rounded-md bg-red-500/10 border border-red-400/30 text-red-300">
        <p className="font-semibold">Error</p>
        <p className="text-sm">Unable to load leaderboards.</p>
      </div>
    );
  }

  const renderPlayerCell = (playerId: string, playerName: string, matchesPlayed: number) => (
    <div className="min-w-0 flex items-center gap-2">
      <CircularAvatar
        src={playerPhotos.get(playerId)}
        alt={playerName}
        size="sm"
        onClick={
          playerPhotos.get(playerId)
            ? () => avatarViewer.open(playerPhotos.get(playerId)!, playerName)
            : undefined
        }
      />
      <div className="min-w-0">
        <Link to={`/players/${playerId}`} className="font-semibold text-white truncate block hover:text-accent-green transition-colors">
          {playerName}
        </Link>
        <p className="text-xs text-slate-400">{matchesPlayed} matches</p>
      </div>
    </div>
  );

  const renderRankCell = (index: number, sticky = false) => {
    const inner = getMedal(index) ? (
      <span
        className="inline-flex items-center justify-center text-lg drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
        title={getMedal(index)!.label}
      >
        {getMedal(index)!.emoji}
      </span>
    ) : (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white tabular-nums">
        {index + 1}
      </span>
    );
    return sticky ? <div className="table-sticky-col px-4 -mx-4">{inner}</div> : <>{inner}</>;
  };

  const rowClass = (index: number) =>
    [
      'row-glow border-b border-white/5 last:border-b-0 transition-colors',
      index % 2 === 1 ? 'bg-white/[0.02]' : '',
      index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const cardRowClass = (index: number) =>
    [
      'row-glow rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/25',
      index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const renderBattingLeaderboard = () => (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <div className="min-w-[46rem]">
          <div className="table-sticky-header sticky top-0 z-10 grid grid-cols-[2.5rem_minmax(9rem,2fr)_repeat(11,minmax(2.75rem,1fr))] gap-x-4 gap-y-2 bg-[#0d1a2e]/95 px-4 py-3 text-[10px] font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 backdrop-blur-md">
            <div className="table-sticky-col z-20 -mx-4 px-4 bg-[#0d1a2e]/95">#</div>
            <div>Player</div>
            <div className="text-right">Runs</div>
            <div className="text-right">Avg</div>
            <div className="text-right">SR</div>
            <div className="text-right">4s</div>
            <div className="text-right">6s</div>
            <div className="text-right">50s</div>
            <div className="text-right">100s</div>
            <div className="text-right">HS</div>
            <div className="text-right">M</div>
            <div className="text-right">Inns</div>
            <div className="text-right">NO</div>
          </div>
          {battingStats.length === 0 ? (
            <EmptyState
              icon="🏏"
              title="No batting statistics yet"
              description="Play your first match to start climbing the leaderboard."
            />
          ) : (
            battingStats.map((stat, index) => (
              <article
                key={stat.playerId}
                className={`grid grid-cols-[2.5rem_minmax(9rem,2fr)_repeat(11,minmax(2.75rem,1fr))] gap-x-4 gap-y-2 items-center px-4 py-3 hover:bg-white/[0.06] ${rowClass(index)}`}
              >
                {renderRankCell(index, true)}
                {renderPlayerCell(stat.playerId, playerNames.get(stat.playerId) ?? 'Player', stat.matches)}
                <div className="text-right">
                  <span className="font-bold text-lg text-emerald-400 tabular-nums">{stat.runs}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-yellow-400 tabular-nums">{stat.average}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-cyan-400 tabular-nums">{stat.strikeRate}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.fours}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.sixes}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.fifties}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.hundreds}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-amber-300 tabular-nums">{stat.highestScore}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.matches}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.innings}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.notOuts}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderBowlingLeaderboard = () => (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <div className="min-w-[38rem]">
          <div className="table-sticky-header sticky top-0 z-10 grid grid-cols-[2.5rem_minmax(9rem,2fr)_repeat(9,minmax(2.75rem,1fr))] gap-x-4 gap-y-2 bg-[#0d1a2e]/95 px-4 py-3 text-[10px] font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 backdrop-blur-md">
            <div className="table-sticky-col z-20 -mx-4 px-4 bg-[#0d1a2e]/95">#</div>
            <div>Player</div>
            <div className="text-right">Wkts</div>
            <div className="text-right">Overs</div>
            <div className="text-right">Runs</div>
            <div className="text-right">Econ</div>
            <div className="text-right">Dots</div>
            <div className="text-right">Mdns</div>
            <div className="text-right">Best</div>
            <div className="text-right">Avg</div>
            <div className="text-right">SR</div>
          </div>
          {bowlingStats.length === 0 ? (
            <EmptyState
              icon="🎯"
              title="No bowling statistics yet"
              description="Take wickets to climb the bowling charts."
            />
          ) : (
            bowlingStats.map((stat, index) => (
              <article
                key={stat.playerId}
                className={`grid grid-cols-[2.5rem_minmax(9rem,2fr)_repeat(9,minmax(2.75rem,1fr))] gap-x-4 gap-y-2 items-center px-4 py-3 hover:bg-white/[0.06] ${rowClass(index)}`}
              >
                {renderRankCell(index, true)}
                {renderPlayerCell(stat.playerId, playerNames.get(stat.playerId) ?? 'Player', stat.matches)}
                <div className="text-right">
                  <span className="font-bold text-lg text-red-400 tabular-nums">{stat.wickets}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.oversDisplay}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.runsConceded}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-orange-400 tabular-nums">{stat.economy}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.dotBalls}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.maidens}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-cyan-300 tabular-nums">{stat.bestBowlingWickets}/{stat.bestBowlingRuns}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-yellow-400 tabular-nums">{stat.average ?? '—'}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-cyan-400 tabular-nums">{stat.strikeRate ?? '—'}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderFieldingLeaderboard = () => (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[2rem_2fr_1fr_1fr_1fr_1fr] gap-2 text-xs font-bold text-slate-300 px-3 py-2.5 border-b border-white/10 uppercase tracking-wider">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">Catches</div>
        <div className="text-right">Run Outs</div>
        <div className="text-right">Stumpings</div>
        <div className="text-right">Total</div>
      </div>
      {fieldingStats.length === 0 ? (
            <EmptyState
              icon="🧤"
              title="No fielding statistics yet"
              description="Make an impact in the field to get noticed."
            />
      ) : (
        fieldingStats.map((stat, index) => (
          <article
            key={stat.playerId}
            className={`grid grid-cols-[2rem_2fr_1fr_1fr_1fr_1fr] gap-2 items-center ${cardRowClass(index)}`}
          >
            {renderRankCell(index)}
            {renderPlayerCell(stat.playerId, playerNames.get(stat.playerId) ?? 'Player', matchesByPlayer.get(stat.playerId) ?? 0)}
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.catches}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.runOuts}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.stumpings}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-blue-300 tabular-nums">{stat.totalDismissals}</span>
            </div>
          </article>
        ))
      )}
    </div>
  );

  const renderPOTMLeaderboard = () => (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[2rem_2fr_1fr_1fr_1fr] gap-2 text-xs font-bold text-slate-300 px-3 py-2.5 border-b border-white/10 uppercase tracking-wider">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">POTM</div>
        <div className="text-right">Runs</div>
        <div className="text-right">Wkts</div>
      </div>
      {potmLeaderboard.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="No Player of the Match awards yet"
              description="Be the difference in a match to take home the Player of the Match award."
            />
      ) : (
        potmLeaderboard.map((stat, index) => (
          <article
            key={stat.id}
            className={`grid grid-cols-[2rem_2fr_1fr_1fr_1fr] gap-2 items-center ${cardRowClass(index)}`}
          >
            {renderRankCell(index)}
            {renderPlayerCell(stat.player_id, stat.playerName, stat.matches_played)}
            <div className="text-right">
              <span className="font-bold text-lg text-amber-400 tabular-nums">{stat.potmCount}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.runs}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-slate-200 tabular-nums">{stat.wickets}</span>
            </div>
          </article>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6 page-container mx-auto w-full px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-white">Leaderboards</h1>
        </div>
        <Link to="/hall-of-fame" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg hover:from-amber-500 hover:to-amber-600 transition-all btn-press">
          🏅 Hall of Fame
        </Link>
      </div>

      {/* Cap Widgets */}
      <div className="grid gap-3 sm:grid-cols-2 stagger-enter">
        <OrangeCapWidget stats={capRows} playerMap={playerNames} playerPhotoMap={playerPhotos} />
        <PurpleCapWidget stats={capRows} playerMap={playerNames} playerPhotoMap={playerPhotos} />
      </div>

      {/* Season Selector */}
      <div className="max-w-xs">
        <SelectField label="Season" value={selectedSeasonId} onChange={(event) => setSelectedSeasonId(event.target.value)}>
          <option value="">All Seasons</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>{season.name}{season.is_active ? ' (Active)' : ''}</option>
          ))}
        </SelectField>
      </div>

      {/* Season Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatChip icon={<CalendarDays className="w-4 h-4" />} label="Completed Matches" value={String(seasonTotals.matches)} />
        <StatChip icon={<Activity className="w-4 h-4" />} label="Total Runs" value={String(seasonTotals.runs)} />
        <StatChip icon={<Shield className="w-4 h-4" />} label="Wickets" value={String(seasonTotals.wickets)} />
        <StatChip icon={<Trophy className="w-4 h-4" />} label="Boundaries" value={`${seasonTotals.fours} / ${seasonTotals.sixes}`} />
        <StatChip icon={<Trophy className="w-4 h-4" />} label="POTM Awarded" value={String(seasonTotals.potms)} />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('batting')}
          className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'batting'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          Batting
        </button>
        <button
          onClick={() => setActiveTab('bowling')}
          className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'bowling'
              ? 'border-red-400 text-red-300'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          Bowling
        </button>
        <button
          onClick={() => setActiveTab('fielding')}
          className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'fielding'
              ? 'border-blue-400 text-blue-300'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          Fielding
        </button>
        <button
          onClick={() => setActiveTab('potm')}
          className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'potm'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          Player of Match
        </button>
      </div>

      {/* Tab Content */}
      <PagePanel title={activeTab === 'batting' ? 'Batting Leaderboard' : activeTab === 'bowling' ? 'Bowling Leaderboard' : activeTab === 'fielding' ? 'Fielding Leaderboard' : 'Player of the Match'}>
        {activeTab === 'batting' && renderBattingLeaderboard()}
        {activeTab === 'bowling' && renderBowlingLeaderboard()}
        {activeTab === 'fielding' && renderFieldingLeaderboard()}
        {activeTab === 'potm' && renderPOTMLeaderboard()}
      </PagePanel>
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl glass p-3 flex items-center gap-2.5 animate-count-up">
      <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm shrink-0 icon-glow">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-300 truncate">{label}</p>
        <p className="text-base font-extrabold text-white tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}
