import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchRepository, type MatchInsert, type TeamAssignment, type TossInput } from '../repositories/matchRepository';

export function useMatches() {
  return useQuery({ queryKey: ['matches'], queryFn: matchRepository.list });
}

export function useParentMatches() {
  return useQuery({ queryKey: ['parent-matches'], queryFn: matchRepository.listParentMatches });
}

export function useMatchHistory() {
  return useQuery({ queryKey: ['match-history'], queryFn: matchRepository.history });
}

export function useMatch(matchId: string | null) {
  return useQuery({ queryKey: ['match', matchId], queryFn: () => matchRepository.get(matchId!), enabled: Boolean(matchId) });
}

export function useMatchPlayers(matchId: string | null) {
  return useQuery({ queryKey: ['match-players', matchId], queryFn: () => matchRepository.listPlayers(matchId!), enabled: Boolean(matchId) });
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MatchInsert) => matchRepository.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['match-history'] });
      void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
      void queryClient.invalidateQueries({ queryKey: ['availability-matches'] });
    }
  });
}

export function useSetCaptains() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, teamACaptainId, teamBCaptainId }: { matchId: string; teamACaptainId: string; teamBCaptainId: string }) =>
      matchRepository.setCaptains(matchId, teamACaptainId, teamBCaptainId),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({ queryKey: ['match', match.id] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['match-history'] });
    }
  });
}

export function useSaveTeams() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, assignments }: { matchId: string; assignments: TeamAssignment[] }) => matchRepository.saveTeams(matchId, assignments),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['match-players', variables.matchId] });
      void queryClient.invalidateQueries({ queryKey: ['match', variables.matchId] });
    }
  });
}

export function useConductToss() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, input }: { matchId: string; input: TossInput }) => matchRepository.conductToss(matchId, input),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({ queryKey: ['match', match.id] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    }
  });
}

export function useStartSuperOver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ parentMatchId, input }: { parentMatchId: string; input: Omit<MatchInsert, 'parent_match_id' | 'is_super_over' | 'overs_per_innings'> }) =>
      matchRepository.startSuperOver(parentMatchId, input),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
      void queryClient.invalidateQueries({ queryKey: ['match-history'] });
      void queryClient.invalidateQueries({ queryKey: ['match', match.parent_match_id] });
    }
  });
}
