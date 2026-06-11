import { useMemo } from 'react';
import type { BallEvent } from '../../types/models';
import { generateCommentary } from '../../domain/scoring/liveMatchUtils';

interface LiveCommentaryProps {
  ballEvents: BallEvent[];
  playerMap: Map<string, string>;
}

export function LiveCommentary({ ballEvents, playerMap }: LiveCommentaryProps) {
  const commentary = useMemo(() => {
    const sorted = [...ballEvents].sort((a, b) => b.sequenceNumber - a.sequenceNumber);
    return sorted.map((e) => generateCommentary(e, playerMap));
  }, [ballEvents, playerMap]);

  if (commentary.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/40 backdrop-blur-sm p-4 shadow-sm space-y-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-lg">🎙️</span> Live Commentary
      </h3>
      <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
        {commentary.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 hover:bg-slate-50/50 ${
              entry.isWicket ? 'bg-red-50/50 border-l-2 border-red-400' :
              entry.isFour ? 'bg-green-50/50 border-l-2 border-green-400' :
              entry.isSix ? 'bg-purple-50/50 border-l-2 border-purple-400' :
              'border-l-2 border-transparent'
            }`}
          >
            <span className="shrink-0 text-[11px] font-bold text-slate-400 w-10 tabular-nums">
              {entry.overDisplay}
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-medium text-slate-600">{entry.bowlerName}</span>
              <span className="text-slate-400 mx-1">to</span>
              <span className="font-medium text-slate-600">{entry.strikerName}</span>
              <span className="ml-1.5 font-semibold">
                {entry.isWicket ? (
                  <span className="text-red-600">{entry.text}</span>
                ) : entry.isFour ? (
                  <span className="text-green-600">{entry.text}</span>
                ) : entry.isSix ? (
                  <span className="text-purple-600">{entry.text}</span>
                ) : (
                  <span className="text-slate-600">{entry.text}</span>
                )}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
