import { PagePanel } from '../../components/common/PagePanel';
import { usePlayers } from '../../hooks/usePlayers';
import { usePlayerStatistics } from '../../hooks/useStatistics';
import { useMemo, useState } from 'react';

export function LeaderboardsPage() {
  const { data: statistics = [], isLoading, error } = usePlayerStatistics();
  const { data: players = [] } = usePlayers();
  const playerNames = useMemo(() => new Map(players.map((player) => [player.id, player.display_name])), [players]);
  const [activeTab, setActiveTab] = useState<'batting' | 'bowling' | 'fielding' | 'potm'>('batting');

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

  // Calculate derived statistics
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

  const renderBattingLeaderboard = () => (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[2rem_2fr_1fr_1fr_1fr_1fr_1fr] gap-2 text-xs font-bold text-slate-600 px-3 py-2 border-b border-slate-200 uppercase tracking-wider">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">Runs</div>
        <div className="text-right">Avg</div>
        <div className="text-right">SR</div>
        <div className="text-right">4s</div>
        <div className="text-right">6s</div>
      </div>
      {battingStats.length === 0 ? (
        <p className="text-slate-500 py-6 text-center">No batting statistics available.</p>
      ) : (
        battingStats.map((stat, index) => (
          <article
            key={stat.id}
            className="grid sm:grid-cols-[2rem_2fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors"
          >
            <span className="font-bold text-slate-600 text-center">{index + 1}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{stat.playerName}</h3>
              <p className="text-xs text-slate-500">{stat.matches_played} matches</p>
            </div>
            <div className="sm:text-right">
              <span className="font-bold text-lg text-teal-600">{stat.runs}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.average}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.strikeRate}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.fours}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.sixes}</span>
            </div>
          </article>
        ))
      )}
    </div>
  );

  const renderBowlingLeaderboard = () => (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[2rem_2fr_1fr_1fr_1fr_1fr_1fr] gap-2 text-xs font-bold text-slate-600 px-3 py-2 border-b border-slate-200 uppercase tracking-wider">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">Wickets</div>
        <div className="text-right">Overs</div>
        <div className="text-right">Runs</div>
        <div className="text-right">Economy</div>
        <div className="text-right">Maidens</div>
      </div>
      {bowlingStats.length === 0 ? (
        <p className="text-slate-500 py-6 text-center">No bowling statistics available.</p>
      ) : (
        bowlingStats.map((stat, index) => (
          <article
            key={stat.id}
            className="grid sm:grid-cols-[2rem_2fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors"
          >
            <span className="font-bold text-slate-600 text-center">{index + 1}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{stat.playerName}</h3>
              <p className="text-xs text-slate-500">{stat.matches_played} matches</p>
            </div>
            <div className="sm:text-right">
              <span className="font-bold text-lg text-red-600">{stat.wickets}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.oversDisplay}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.runs_conceded}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.economy}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.maidens}</span>
            </div>
          </article>
        ))
      )}
    </div>
  );

  const renderFieldingLeaderboard = () => (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[2rem_2fr_1fr_1fr_1fr_1fr] gap-2 text-xs font-bold text-slate-600 px-3 py-2 border-b border-slate-200 uppercase tracking-wider">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">Catches</div>
        <div className="text-right">Run Outs</div>
        <div className="text-right">Stumpings</div>
        <div className="text-right">Total</div>
      </div>
      {fieldingStats.length === 0 ? (
        <p className="text-slate-500 py-6 text-center">No fielding statistics available.</p>
      ) : (
        fieldingStats.map((stat, index) => (
          <article
            key={stat.id}
            className="grid sm:grid-cols-[2rem_2fr_1fr_1fr_1fr_1fr] gap-2 items-center rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors"
          >
            <span className="font-bold text-slate-600 text-center">{index + 1}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{stat.playerName}</h3>
              <p className="text-xs text-slate-500">{stat.matches_played} matches</p>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.catches}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.run_outs}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-sm text-slate-600">{stat.stumpings}</span>
            </div>
            <div className="sm:text-right">
              <span className="font-bold text-slate-800">{stat.totalDismissals}</span>
            </div>
          </article>
        ))
      )}
    </div>
  );

  const renderPOTMLeaderboard = () => (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[2rem_2fr_1fr] gap-2 text-xs font-bold text-slate-600 px-3 py-2 border-b border-slate-200 uppercase tracking-wider">
        <div>#</div>
        <div>Player</div>
        <div className="text-right">POTM Awards</div>
      </div>
      <p className="text-slate-500 py-6 text-center text-sm">
        Player of the Match statistics will be displayed once matches are completed with awards assigned.
      </p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('batting')}
          className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'batting'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Batting
        </button>
        <button
          onClick={() => setActiveTab('bowling')}
          className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'bowling'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Bowling
        </button>
        <button
          onClick={() => setActiveTab('fielding')}
          className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'fielding'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          Fielding
        </button>
        <button
          onClick={() => setActiveTab('potm')}
          className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors border-b-2 ${
            activeTab === 'potm'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-slate-600 hover:text-slate-800'
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
