import { useMemo } from 'react';
import type { PlayerStatsSource } from '../utils/playerDashboard';
import { useAllBallEvents } from './useBallEvents';
import { useAllAvailability } from './useAvailability';
import { useMatchPlayersByMatches, useParentMatches } from './useMatches';

export interface PlayerStatsSourceResult {
  source: PlayerStatsSource;
  isLoading: boolean;
}

export function usePlayerStatsSource(): PlayerStatsSourceResult {
  const { data: matches = [], isLoading: matchesLoading } = useParentMatches();
  const { data: allAvailability = [] } = useAllAvailability();

  const completedMatches = useMemo(
    () => matches.filter((m) => m.status === 'completed' && !m.is_super_over),
    [matches]
  );
  const completedIds = useMemo(() => completedMatches.map((m) => m.id), [completedMatches]);

  const { data: events = [], isLoading: eventsLoading } = useAllBallEvents(completedIds);
  const { data: matchPlayers = [], isLoading: matchPlayersLoading } = useMatchPlayersByMatches(completedIds);

  return useMemo(
    () => ({
      source: { matches: completedMatches, events, matchPlayers, allAvailability },
      isLoading: matchesLoading || eventsLoading || matchPlayersLoading,
    }),
    [completedMatches, events, matchPlayers, allAvailability, matchesLoading, eventsLoading, matchPlayersLoading]
  );
}
