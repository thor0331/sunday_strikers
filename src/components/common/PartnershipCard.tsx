import type { BallEvent } from '../../types/models';
import { computePartnership } from '../../domain/scoring/liveMatchUtils';

interface PartnershipCardProps {
  ballEvents: BallEvent[];
  strikerId: string | null;
  nonStrikerId: string | null;
}

export function PartnershipCard({ ballEvents, strikerId, nonStrikerId }: PartnershipCardProps) {
  const partnership = computePartnership(ballEvents, strikerId, nonStrikerId);

  if (!strikerId || !nonStrikerId) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/40 backdrop-blur-sm p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partnership</h3>
        <span className="text-sm font-bold text-slate-700">
          {partnership.runs}<span className="text-slate-400 font-medium"> ({partnership.balls})</span>
        </span>
      </div>
    </div>
  );
}
