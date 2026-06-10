import { PagePanel } from '../../components/common/PagePanel';
import { MatchHistoryRow } from '../../components/matches/MatchHistoryRow';
import { useMatchHistory } from '../../hooks/useMatches';
import { useEffect } from 'react';
import { Trophy, AlertCircle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      <div className="mb-3 flex gap-2">
        <Link to="/matches" className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors">
          <Zap className="w-3 h-3" /> Match Center
        </Link>
        <Link to="/teams" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
          ⚔️ Team Comparison
        </Link>
      </div>
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
            <p className="text-slate-500 font-medium">Loading matches...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-5 text-red-700 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="font-semibold">Error Loading Match History</p>
          </div>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unable to load match history.'}</p>
        </div>
      )}

      {!isLoading && !error && completedMatches.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-slate-400" />
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
