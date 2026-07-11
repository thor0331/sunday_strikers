import { PagePanel } from '../../components/common/PagePanel';
import { Button } from '../../components/forms/Button';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { usePlayers } from '../../hooks/usePlayers';
import { useParentMatches } from '../../hooks/useMatches';
import { useSeasons } from '../../hooks/useSeasons';
import { matchRepository } from '../../repositories/matchRepository';

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
    if (!window.confirm('This will force a recalculation of all player statistics by toggling each completed match status. This may take a while.\n\nContinue?')) return;
    setRunning(true);
    clearLog();
    const completedMatches = matches.filter((m) => m.status === 'completed');
    addLog(`Found ${completedMatches.length} completed matches to rebuild.`);

    for (let i = 0; i < completedMatches.length; i++) {
      const m = completedMatches[i];
      addLog(`Processing ${i + 1}/${completedMatches.length}: ${m.match_name}...`);
      try {
        await matchRepository.update(m.id, { status: 'draft' });
        await matchRepository.update(m.id, { status: 'completed' });
      } catch (err) {
        addLog(`Error processing ${m.match_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
    addLog('Rebuild complete. Statistics cache refreshed.');
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
      <h2 className="text-lg font-bold text-slate-800">Maintenance</h2>

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

      {/* Activity Log */}
      {log.length > 0 && (
        <PagePanel title="Activity Log">
          <div className="max-h-60 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-green-400 space-y-0.5">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
          <button onClick={clearLog} className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">Clear log</button>
        </PagePanel>
      )}
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
      <p className="text-2xl font-bold text-teal-600">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}
