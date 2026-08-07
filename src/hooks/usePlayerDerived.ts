import { useQuery } from '@tanstack/react-query';
import { useParentMatches } from './useMatches';
import { matchRepository } from '../repositories/matchRepository';
import { ballEventsRepository } from '../repositories/ballEventsRepository';
import { useMemo } from 'react';
import {
  computeAchievements,
  computeFormRating,
  computePlayerInningsScores,
  computeStreaks,
} from '../utils/analytics';

export function usePlayerInningsHistory(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-innings-history', playerId],
    queryFn: async () => {
      if (!playerId) return [];
      const matches = await matchRepository.listParentMatches();
      const completedMatches = matches.filter(m => m.status === 'completed').slice(0, 15);

      const inningsList: { innings: import('../types/models').Innings; match: import('../types/models').Match }[] = [];
      for (const match of completedMatches) {
        const innings = await matchRepository.getInnings(match.id);
        inningsList.push(...innings.map(i => ({ innings: i, match })));
      }

      const completedInnings = inningsList.filter(i => i.innings.status === 'completed');

      const ballEventsByInnings: { innings: import('../types/models').Innings; events: import('../types/models').BallEvent[]; match: import('../types/models').Match }[] = [];
      for (const { innings, match } of completedInnings) {
        const events = await ballEventsRepository.getBallEvents(innings.id);
        ballEventsByInnings.push({ innings, events, match });
      }

      return computePlayerInningsScores(playerId, ballEventsByInnings);
    },
    enabled: Boolean(playerId),
    staleTime: 30000,
  });
}

export function usePlayerStreaks(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-streaks', playerId],
    queryFn: async () => {
      if (!playerId) return [];
      const matches = await matchRepository.listParentMatches();
      const completedMatches = matches.filter(m => m.status === 'completed').slice(0, 20);

      const ballEventsByInnings: { innings: import('../types/models').Innings; events: import('../types/models').BallEvent[]; match: import('../types/models').Match }[] = [];
      for (const match of completedMatches) {
        const innings = await matchRepository.getInnings(match.id);
        const completedInnings = innings.filter(i => i.status === 'completed');
        for (const innings of completedInnings) {
          const events = await ballEventsRepository.getBallEvents(innings.id);
          ballEventsByInnings.push({ innings, events, match });
        }
      }

      return computeStreaks(playerId, matches, ballEventsByInnings);
    },
    enabled: Boolean(playerId),
    staleTime: 30000,
  });
}

export function usePlayerFormData(stats: import('../types/models').PlayerStatistics | undefined, potmCount: number) {
  return useMemo(() => {
    const achievements = computeAchievements(stats, potmCount);
    const formRating = computeFormRating(stats);
    return { achievements, formRating };
  }, [stats, potmCount]);
}

export function usePotmCount() {
  const { data: matches = [] } = useParentMatches();

  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of matches) {
      if (m.player_of_match_id) {
        counts[m.player_of_match_id] = (counts[m.player_of_match_id] || 0) + 1;
      }
    }
    return counts;
  }, [matches]);
}
