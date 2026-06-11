import type { BallEvent } from '../../types/models';
import { getLastOverBalls } from '../../domain/scoring/liveMatchUtils';

interface LastOverTrackerProps {
  ballEvents: BallEvent[];
  legalBalls: number;
}

export function LastOverTracker({ ballEvents, legalBalls }: LastOverTrackerProps) {
  const balls = getLastOverBalls(ballEvents, legalBalls);

  if (balls.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/40 backdrop-blur-sm p-4 shadow-sm space-y-2.5">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Over</h3>
      <div className="flex gap-2 flex-wrap">
        {balls.map((ball, i) => (
          <div
            key={i}
            className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-extrabold border shadow-sm transition-all duration-200 hover:scale-110 ${ball.color}`}
          >
            {ball.display}
          </div>
        ))}
      </div>
    </div>
  );
}
