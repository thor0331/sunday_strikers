import { PagePanel } from '../../components/common/PagePanel';
import { MatchHistoryRow } from '../../components/matches/MatchHistoryRow';
import { useMatchHistory } from '../../hooks/useMatches';
import { useEffect } from 'react';

export function MatchHistoryPage() {
  const { data: history = [], isLoading, error } = useMatchHistory();

  // Log errors to console for debugging
  useEffect(() => {
    if (error) {
      console.error('[MatchHistory] Error loading match history:', error);
      if (error instanceof Error) {
        console.error('[MatchHistory] Error message:', error.message);
        console.error('[MatchHistory] Error stack:', error.stack);
      }
    }
  }, [error]);

  // Filter to show only completed matches
  const completedMatches = history.filter((item) => item.match.status === 'completed');

  return (
    <PagePanel title="Match History">
      {isLoading && <p className="text-slate-400 font-medium animate-pulse">Loading matches...</p>}
      
      {error && (
        <div className="rounded-lg bg-red-950 border border-red-700 p-4 text-red-200 space-y-2">
          <p className="font-semibold">Error Loading Match History</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unable to load match history.'}</p>
          <p className="text-xs text-red-300">Check browser console for detailed error information.</p>
        </div>
      )}

      {!isLoading && !error && completedMatches.length === 0 && (
        <div className="rounded-lg bg-slate-800 border border-slate-700 p-8 text-center">
          <p className="text-slate-400">No completed matches yet. Complete a match to see it here.</p>
        </div>
      )}

      {!error && completedMatches.length > 0 && (
        <div className="grid gap-3">
          {completedMatches.map((item) => (
            <MatchHistoryRow key={item.match.id} item={item} />
          ))}
        </div>
      )}
    </PagePanel>
  );
}
