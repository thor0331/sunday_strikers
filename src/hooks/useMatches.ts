import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { matchRepository, type MatchInsert, type MatchUpdate, type TeamAssignment, type TossInput } from '../repositories/matchRepository';
import type { TeamSide } from '../types/models';

export function useMatches() {
  return useQuery({ queryKey: ['matches'], queryFn: matchRepository.list });
}

export function useParentMatches() {
  return useQuery({ queryKey: ['parent-matches'], queryFn: matchRepository.listParentMatches, refetchInterval: 15000 });
}

export function useCompletedMatches() {
  return useQuery({ queryKey: ['completed-matches'], queryFn: matchRepository.listCompletedMatches });
}

export function useMatchHistory() {
  return useQuery({
    queryKey: ['match-history'],
    queryFn: () => matchRepository.history()
  });
}

export function useMatch(matchId: string | null) {
  return useQuery({ queryKey: ['match', matchId], queryFn: () => matchRepository.get(matchId!), enabled: Boolean(matchId), refetchInterval: 15000 });
}

export function useMatchPlayers(matchId: string | null) {
  return useQuery({ queryKey: ['match-players', matchId], queryFn: () => matchRepository.listPlayers(matchId!), enabled: Boolean(matchId) });
}

export function useMatchPlayersByMatches(matchIds: string[]) {
  return useQuery({
    queryKey: ['match-players-all', matchIds],
    queryFn: () => matchRepository.listPlayersByMatches(matchIds),
    enabled: matchIds.length > 0,
  });
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

export function useInnings(matchId: string | null) {
  return useQuery({
    queryKey: ['innings', matchId],
    queryFn: () => matchRepository.getInnings(matchId!),
    enabled: Boolean(matchId),
    refetchInterval: 15000,
  });
}

export function useInningsByMatches(matchIds: string[]) {
  return useQuery({
    queryKey: ['innings-all', matchIds],
    queryFn: () => matchRepository.getInningsByMatches(matchIds),
    enabled: matchIds.length > 0,
  });
}

export function useUpdateInnings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inningsId, input }: { inningsId: string; input: Parameters<typeof matchRepository.updateInnings>[1] }) =>
      matchRepository.updateInnings(inningsId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['innings'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
    }
  });
}

export function useCompleteMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
  matchId,
  winner,
  resultText,
  playerOfMatchId
}: {
  matchId: string;
  winner: TeamSide | null;
  resultText: string;
  playerOfMatchId?: string | null;
}) =>
  matchRepository.completeMatch(
    matchId,
    winner,
    resultText,
    playerOfMatchId
  ),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({ queryKey: ['match', match.id] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
      void queryClient.invalidateQueries({ queryKey: ['match-history'] });
      void queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
    }
  });
}

export function useSetMatchInProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => matchRepository.setInProgress(matchId),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({ queryKey: ['match', match.id] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
      void queryClient.invalidateQueries({ queryKey: ['match-history'] });
    }
  });
}

export function useUpdateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, input }: { matchId: string; input: MatchUpdate }) => matchRepository.update(matchId, input),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({ queryKey: ['match', match.id] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
      void queryClient.invalidateQueries({ queryKey: ['match-history'] });
    }
  });
}

export function useDeleteMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => matchRepository.delete(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['parent-matches'] });
      void queryClient.invalidateQueries({ queryKey: ['match-history'] });
      void queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
    }
  });
}

export function useResetMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchId: string) => matchRepository.reset(matchId),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({ queryKey: ['match', match.id] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['innings', match.id] });
      void queryClient.invalidateQueries({ queryKey: ['ball-events', match.id] });
      void queryClient.invalidateQueries({ queryKey: ['match-history'] });
      void queryClient.invalidateQueries({ queryKey: ['player-statistics'] });
    }
  });
}
