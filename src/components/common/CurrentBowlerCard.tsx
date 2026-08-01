import { useEffect, useState } from 'react';
import type { DerivedInningsState } from '../../types/models';

interface CurrentBowlerCardProps {
  inningsState: DerivedInningsState;
  playerMap: Map<string, string>;
  playerPhotoMap: Map<string, string | null>;
  bowlingTeamName: string;
}

export function CurrentBowlerCard({ inningsState, playerMap, playerPhotoMap, bowlingTeamName }: CurrentBowlerCardProps) {
  const bowlerId = inningsState.currentBowlerId;
  const stats = bowlerId ? inningsState.bowlingStats[bowlerId] : undefined;
  const photoSrc = bowlerId ? playerPhotoMap.get(bowlerId) ?? null : null;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoSrc]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-lg">🎯</span> Current Bowler
        </h3>
        <span className="text-[10px] font-medium text-slate-400">{bowlingTeamName}</span>
      </div>

      {bowlerId && stats ? (
        <div className="rounded-xl bg-gradient-to-br from-red-400/15 via-red-400/10 to-orange-400/10 border border-red-400/25 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="shrink-0 h-8 w-8 rounded-full overflow-hidden border-2 border-white/20 shadow-sm">
              {photoSrc && !imgFailed ? (
                <img src={photoSrc} alt={playerMap.get(bowlerId) ?? ''} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-400 to-orange-500 text-xs font-bold text-white">
                  {(playerMap.get(bowlerId) ?? '?').charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <p className="font-semibold text-sm text-slate-100 truncate">{playerMap.get(bowlerId) ?? 'Unknown'}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/10 p-2">
              <p className="text-[9px] text-red-400/80 uppercase font-bold tracking-wider">Overs</p>
              <p className="text-base font-extrabold text-red-300">{stats.oversDisplay}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/10 p-2">
              <p className="text-[9px] text-red-400/80 uppercase font-bold tracking-wider">M</p>
              <p className="text-base font-extrabold text-red-300">{stats.maidens}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/10 p-2">
              <p className="text-[9px] text-red-400/80 uppercase font-bold tracking-wider">Runs</p>
              <p className="text-base font-extrabold text-red-300">{stats.runsConceded}</p>
            </div>
            <div className="rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/10 p-2">
              <p className="text-[9px] text-red-400/80 uppercase font-bold tracking-wider">W</p>
              <p className="text-base font-extrabold text-red-300">{stats.wickets}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-white/[0.04] backdrop-blur-sm border border-white/10 p-2">
              <p className="text-[9px] text-red-400/80 uppercase font-bold tracking-wider">Eco</p>
              <p className="text-base font-extrabold text-red-300">{stats.economy.toFixed(1)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 text-center">
          <p className="text-sm text-slate-400 font-medium">Bowler yet to be selected</p>
        </div>
      )}
    </div>
  );
}
