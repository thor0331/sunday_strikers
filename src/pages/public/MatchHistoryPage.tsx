import { PagePanel } from '../../components/common/PagePanel';
import { MatchHistoryRow } from '../../components/matches/MatchHistoryRow';
import { useMatchHistory } from '../../hooks/useMatches';
import { useEffect } from 'react';
import { Trophy, AlertCircle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '../../components/common/Skeleton';

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
        <Link to="/matches" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-teal-300 transition-colors hover:bg-white/15">
          <Zap className="h-3 w-3" /> Match Center
        </Link>
        <Link to="/teams" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-blue-300 transition-colors hover:bg-white/15">
          ⚔️ Team Comparison
        </Link>
      </div>
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      )}

      {error && (
        <div className="space-y-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="font-semibold">Error Loading Match History</p>
          </div>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unable to load match history.'}</p>
        </div>
      )}

      {!isLoading && !error && completedMatches.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/20 p-10 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <Trophy className="h-6 w-6 text-slate-400" />
            </div>
          </div>
          <p className="text-slate-300">No completed matches yet.</p>
        </div>
      )}

      {!error && completedMatches.length > 0 && (
        <div className="grid gap-3 stagger-enter">
          {completedMatches.map((item) => (
            <MatchHistoryRow key={item.match.id} item={item} />
          ))}
        </div>
      )}
    </PagePanel>
  );
}
