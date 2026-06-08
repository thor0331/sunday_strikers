import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { availabilityRepository, type AvailabilityStatus } from '../repositories/availabilityRepository';

export function useAvailabilityMatches() {
  return useQuery({ queryKey: ['availability-matches'], queryFn: availabilityRepository.listMatchesForAvailability });
}

export function useMatchAvailability(matchId: string | null) {
  return useQuery({
    queryKey: ['availability', matchId],
    queryFn: () => availabilityRepository.listForMatch(matchId!),
    enabled: Boolean(matchId)
  });
}

export function useSetAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, playerId, status, note }: { matchId: string; playerId: string; status: AvailabilityStatus; note?: string | null }) =>
      availabilityRepository.setStatus(matchId, playerId, status, note),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['availability', variables.matchId] });
    }
  });
}
