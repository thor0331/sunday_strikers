import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ScoringContext } from '../domain/scoring/scoringEngine';
import { ballEventsRepository, type CreateBallEventInput } from '../repositories/ballEventsRepository';
import { useScoringStore } from '../stores/scoringStore';

export function useBallEvents(inningsId: string | null) {
  return useQuery({
    queryKey: ['ball-events', inningsId],
    queryFn: () => ballEventsRepository.getBallEvents(inningsId!),
    enabled: Boolean(inningsId),
    refetchInterval: 10000,
  });
}

export function useAllBallEvents(matchIds: string[]) {
  return useQuery({
    queryKey: ['ball-events-all', matchIds],
    queryFn: () => ballEventsRepository.getBallEventsByMatches(matchIds),
    enabled: matchIds.length > 0,
  });
}

export function useCreateBallEvent() {
  const queryClient = useQueryClient();
  const createBallEvent = useScoringStore((state) => state.createBallEvent);

  return useMutation({
    mutationFn: ({ input, context }: { input: CreateBallEventInput; context: ScoringContext }) => createBallEvent(input, context),
    onSuccess: (_inningsState, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['ball-events', variables.context.inningsId] });
      void queryClient.invalidateQueries({ queryKey: ['ball-events-all'] });
      void queryClient.invalidateQueries({ queryKey: ['innings'] });
      void queryClient.invalidateQueries({ queryKey: ['match'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
    }
  });
}

export function useUndoLastBall() {
  const queryClient = useQueryClient();
  const undoLastBall = useScoringStore((state) => state.undoLastBall);

  return useMutation({
    mutationFn: ({ inningsId, context }: { inningsId?: string; context: ScoringContext }) => undoLastBall(inningsId, context),
    onSuccess: (_inningsState, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['ball-events', variables.inningsId ?? variables.context.inningsId] });
      void queryClient.invalidateQueries({ queryKey: ['ball-events-all'] });
      void queryClient.invalidateQueries({ queryKey: ['innings'] });
      void queryClient.invalidateQueries({ queryKey: ['match'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
    }
  });
}
