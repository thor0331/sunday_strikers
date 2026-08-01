import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';

export function WatchLiveLink({ matchId, className = '' }: { matchId: string; className?: string }) {
  return (
    <Link
      to={`/broadcast/${matchId}`}
      onClick={(e) => e.stopPropagation()}
      className={`btn-press mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/20 ${className}`}
    >
      <Radio className="h-3.5 w-3.5" />
      Watch Live
    </Link>
  );
}
