import { useMemo } from 'react';
import { buildPlayerDashboardData } from '../utils/playerDashboard';
import { usePlayerStatsSource } from './usePlayerStatsSource';

export function usePlayerDashboard(playerId: string | null) {
  const { source, isLoading } = usePlayerStatsSource();

  return useMemo(() => {
    if (!playerId) return null;
    return { data: buildPlayerDashboardData(playerId, source), isLoading };
  }, [playerId, source, isLoading]);
}
