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

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/40 backdrop-blur-sm p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="text-lg">🎯</span> Current Bowler
        </h3>
        <span className="text-[10px] font-medium text-slate-400">{bowlingTeamName}</span>
      </div>

      {bowlerId && stats ? (
        <div className="rounded-xl bg-gradient-to-br from-red-500/5 via-red-500/5 to-orange-500/5 border border-red-200/50 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="shrink-0 h-8 w-8 rounded-full overflow-hidden border-2 border-white/80 shadow-sm">
              {playerPhotoMap.get(bowlerId) ? (
                <img src={playerPhotoMap.get(bowlerId)!} alt={playerMap.get(bowlerId) ?? ''} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-400 to-orange-500 text-xs font-bold text-white">
                  {(playerMap.get(bowlerId) ?? '?').charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <p className="font-semibold text-sm text-slate-800 truncate">{playerMap.get(bowlerId) ?? 'Unknown'}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-white/50 backdrop-blur-sm border border-red-100 p-2">
              <p className="text-[9px] text-red-500/70 uppercase font-bold tracking-wider">Overs</p>
              <p className="text-base font-extrabold text-red-700">{stats.oversDisplay}</p>
            </div>
            <div className="rounded-lg bg-white/50 backdrop-blur-sm border border-red-100 p-2">
              <p className="text-[9px] text-red-500/70 uppercase font-bold tracking-wider">M</p>
              <p className="text-base font-extrabold text-red-700">{stats.maidens}</p>
            </div>
            <div className="rounded-lg bg-white/50 backdrop-blur-sm border border-red-100 p-2">
              <p className="text-[9px] text-red-500/70 uppercase font-bold tracking-wider">Runs</p>
              <p className="text-base font-extrabold text-red-700">{stats.runsConceded}</p>
            </div>
            <div className="rounded-lg bg-white/50 backdrop-blur-sm border border-red-100 p-2">
              <p className="text-[9px] text-red-500/70 uppercase font-bold tracking-wider">W</p>
              <p className="text-base font-extrabold text-red-700">{stats.wickets}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-white/50 backdrop-blur-sm border border-red-100 p-2">
              <p className="text-[9px] text-red-500/70 uppercase font-bold tracking-wider">Eco</p>
              <p className="text-base font-extrabold text-red-700">{stats.economy.toFixed(1)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-400 font-medium">Bowler yet to be selected</p>
        </div>
      )}
    </div>
  );
}
