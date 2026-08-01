import { useEffect, useState } from 'react';
import type { DerivedInningsState } from '../../types/models';

interface CurrentBatsmenCardProps {
  inningsState: DerivedInningsState;
  playerMap: Map<string, string>;
  playerPhotoMap: Map<string, string | null>;
  battingTeamName: string;
}

function BatsmanCard({
  playerId,
  stats,
  playerMap,
  playerPhotoMap,
  isStriker,
}: {
  playerId: string | null;
  stats: { runs: number; balls: number; fours: number; sixes: number; strikeRate: number } | undefined;
  playerMap: Map<string, string>;
  playerPhotoMap: Map<string, string | null>;
  isStriker: boolean;
}) {
  if (!playerId) return null;

  const photoSrc = playerPhotoMap.get(playerId) ?? null;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoSrc]);

  return (
    <div className={`rounded-xl p-3.5 backdrop-blur-md border transition-all duration-200 ${
      isStriker
        ? 'bg-gradient-to-br from-teal-400/15 to-teal-400/5 border-teal-400/25 shadow-sm shadow-teal-500/10'
        : 'bg-white/[0.04] border-white/10 shadow-sm'
    }`}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="shrink-0 h-8 w-8 rounded-full overflow-hidden border-2 border-white/20 shadow-sm">
          {photoSrc && !imgFailed ? (
            <img src={photoSrc} alt={playerMap.get(playerId) ?? ''} className="h-full w-full object-cover" onError={() => setImgFailed(true)} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-bold text-white">
              {(playerMap.get(playerId) ?? '?').charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isStriker && <span className="text-teal-400 font-bold text-sm leading-none">⭐</span>}
            <p className={`font-semibold truncate text-sm ${isStriker ? 'text-teal-300' : 'text-slate-200'}`}>
              {playerMap.get(playerId) ?? 'Unknown'}
            </p>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">{isStriker ? 'Striker' : 'Non-Striker'}</p>
        </div>
      </div>
      {stats ? (
        <div className="grid grid-cols-5 gap-1 text-center">
          <div className="col-span-2">
            <p className="text-slate-400 uppercase text-[9px] font-bold tracking-wider">Runs (Balls)</p>
            <p className={`text-lg font-extrabold ${isStriker ? 'text-teal-300' : 'text-slate-200'}`}>
              {stats.runs}<span className="text-slate-400 text-sm font-medium">({stats.balls})</span>
            </p>
          </div>
          <div>
            <p className="text-slate-400 uppercase text-[9px] font-bold tracking-wider">4s</p>
            <p className={`text-base font-bold ${isStriker ? 'text-teal-400' : 'text-slate-300'}`}>{stats.fours}</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase text-[9px] font-bold tracking-wider">6s</p>
            <p className={`text-base font-bold ${isStriker ? 'text-teal-400' : 'text-slate-300'}`}>{stats.sixes}</p>
          </div>
          <div>
            <p className="text-slate-400 uppercase text-[9px] font-bold tracking-wider">SR</p>
            <p className={`text-base font-bold ${isStriker ? 'text-teal-400' : 'text-slate-300'}`}>{stats.strikeRate.toFixed(1)}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-1">Yet to bat</p>
      )}
    </div>
  );
}

export function CurrentBatsmenCard({ inningsState, playerMap, playerPhotoMap, battingTeamName }: CurrentBatsmenCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-lg">🏏</span> Current Batsmen
        </h3>
        <span className="text-[10px] font-medium text-slate-400">{battingTeamName}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <BatsmanCard
          playerId={inningsState.strikerId}
          stats={inningsState.strikerId ? inningsState.battingStats[inningsState.strikerId] : undefined}
          playerMap={playerMap}
          playerPhotoMap={playerPhotoMap}
          isStriker
        />
        <BatsmanCard
          playerId={inningsState.nonStrikerId}
          stats={inningsState.nonStrikerId ? inningsState.battingStats[inningsState.nonStrikerId] : undefined}
          playerMap={playerMap}
          playerPhotoMap={playerPhotoMap}
          isStriker={false}
        />
      </div>
    </div>
  );
}
