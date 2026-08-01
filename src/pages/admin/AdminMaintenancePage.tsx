import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { usePlayers } from '../../hooks/usePlayers';
import { useParentMatches } from '../../hooks/useMatches';
import { useSeasons } from '../../hooks/useSeasons';
import { rebuildAllStatistics, recalculateSeasonStats } from '../../services/statisticsService';

export function AdminMaintenancePage() {
  const queryClient = useQueryClient();
  const { data: players = [] } = usePlayers();
  const { data: matches = [] } = useParentMatches();
  const { data: seasons = [] } = useSeasons();
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (msg: string) => setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const clearLog = () => setLog([]);

  async function handleRefreshStats() {
    setRunning(true);
    clearLog();
    addLog('Refreshing statistics cache...');
    await queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
    addLog('Statistics cache refreshed successfully.');
    setRunning(false);
  }

  async function handleRebuildStatistics() {
    if (!window.confirm('This will recalculate all player statistics from ball event data for every completed match. This may take a while.\n\nContinue?')) return;
    setRunning(true);
    clearLog();
    addLog('Starting full statistics rebuild...');

    try {
      const result = await rebuildAllStatistics((progress) => {
        addLog(progress.message);
      });

      addLog(`\nRebuild complete.`);
      addLog(`Seasons processed: ${result.seasonsProcessed}`);
      addLog(`Player-season records updated: ${result.playersUpdated}`);

      if (result.errors.length > 0) {
        addLog(`\nErrors encountered:`);
        for (const err of result.errors) {
          addLog(`  - ${err}`);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
      addLog('Statistics cache refreshed.');
    } catch (err) {
      addLog(`FATAL: Rebuild failed - ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('[Maintenance] Statistics rebuild failed:', err);
    }

    setRunning(false);
  }

  async function handleRebuildSeason(seasonId: string, seasonName: string) {
    if (!window.confirm(`Recalculate statistics for "${seasonName}"?`)) return;
    setRunning(true);
    clearLog();
    addLog(`Starting rebuild for season: ${seasonName}...`);

    try {
      await recalculateSeasonStats(seasonId, (progress) => {
        addLog(progress.message);
      });
      addLog(`Season "${seasonName}" statistics rebuilt successfully.`);
      await queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
      addLog('Statistics cache refreshed.');
    } catch (err) {
      addLog(`ERROR: Failed to rebuild season "${seasonName}" - ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(`[Maintenance] Season rebuild failed for ${seasonName}:`, err);
    }

    setRunning(false);
  }

  async function handleRefreshLeaderboards() {
    setRunning(true);
    clearLog();
    addLog('Refreshing leaderboards...');
    await queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
    await queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
    addLog('Leaderboards refreshed.');
    setRunning(false);
  }

  async function handleRefreshHallOfFame() {
    setRunning(true);
    clearLog();
    addLog('Refreshing Hall of Fame data...');
    await queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
    await queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
    addLog('Hall of Fame data refreshed.');
    setRunning(false);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4">
      <h2 className="text-lg font-bold text-slate-100">Maintenance</h2>

      {/* System Status */}
      <PagePanel title="System Status">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusCard label="Players" value={players.length} />
          <StatusCard label="Matches" value={matches.length} />
          <StatusCard label="Completed" value={matches.filter((m) => m.status === 'completed').length} />
          <StatusCard label="Seasons" value={seasons.length} />
        </div>
      </PagePanel>

      {/* Actions */}
      <PagePanel title="Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={handleRefreshStats} disabled={running} variant="secondary">
            Refresh Statistics Cache
          </Button>
          <Button onClick={handleRebuildStatistics} disabled={running}>
            Rebuild All Statistics
          </Button>
          <Button onClick={handleRefreshLeaderboards} disabled={running} variant="secondary">
            Refresh Leaderboards
          </Button>
          <Button onClick={handleRefreshHallOfFame} disabled={running} variant="secondary">
            Refresh Hall of Fame
          </Button>
        </div>
      </PagePanel>

      {/* Per-Season Rebuild */}
      {seasons.length > 0 && (
        <PagePanel title="Rebuild by Season">
          <p className="text-xs text-slate-400 mb-3">
            Recalculate statistics for a specific season. Useful when only recent matches need updating.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {seasons.map((season) => (
              <button
                key={season.id}
                type="button"
                onClick={() => handleRebuildSeason(season.id, season.name)}
                disabled={running}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm font-medium text-slate-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {season.name}
              </button>
            ))}
          </div>
        </PagePanel>
      )}

      {/* Activity Log */}
      {log.length > 0 && (
        <PagePanel title="Activity Log">
          <div className="max-h-60 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400 space-y-0.5">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <button onClick={clearLog} className="mt-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">Clear log</button>
        </PagePanel>
      )}
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center">
      <p className="text-2xl font-bold text-teal-300">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}
