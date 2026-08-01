import { useMemo } from 'react';
import { computeComparisonData, type PlayerComparisonData } from '../utils/playerComparison';
import { usePlayerStatsSource } from './usePlayerStatsSource';

export interface PlayerComparisonResult {
  data: PlayerComparisonData;
  isLoading: boolean;
}

export function usePlayerComparison(playerA: string | null, playerB: string | null): PlayerComparisonResult | null {
  const { source, isLoading } = usePlayerStatsSource();

  return useMemo(() => {
    if (!playerA || !playerB || playerA === playerB) return null;
    return { data: computeComparisonData(playerA, playerB, source), isLoading };
  }, [playerA, playerB, source, isLoading]);
}
