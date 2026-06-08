import { useQuery } from '@tanstack/react-query';
import { statisticsRepository } from '../repositories/statisticsRepository';

export function usePlayerStatistics() {
  return useQuery({ queryKey: ['player-statistics'], queryFn: statisticsRepository.listPlayerStatistics });
}
