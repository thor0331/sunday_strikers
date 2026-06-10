import { PagePanel } from '../../components/common/PagePanel';
import { MatchHistoryRow } from '../../components/matches/MatchHistoryRow';
import { useMatchHistory } from '../../hooks/useMatches';
import { useEffect } from 'react';
import { Trophy, AlertCircle } from 'lucide-react';

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
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
            <p className="text-slate-500 font-medium">Loading matches...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-5 text-red-300 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="font-semibold">Error Loading Match History</p>
          </div>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unable to load match history.'}</p>
        </div>
      )}

      {!isLoading && !error && completedMatches.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-700/50 p-10 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-full bg-slate-700/50 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-slate-500" />
            </div>
          </div>
          <p className="text-slate-500">No completed matches yet.</p>
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
