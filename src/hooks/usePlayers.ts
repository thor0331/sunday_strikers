import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { playerRepository, type PlayerInsert, type PlayerUpdate } from '../repositories/playerRepository';

export function usePlayers() {
  return useQuery({ queryKey: ['players'], queryFn: playerRepository.list });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlayerInsert) => playerRepository.create(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['players'] })
  });
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PlayerUpdate }) => playerRepository.update(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['players'] })
  });
}

export function useDeletePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => playerRepository.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['players'] })
  });
}

export function useUploadPlayerPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, file }: { playerId: string; file: File }) => playerRepository.uploadPhoto(playerId, file),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['players'] })
  });
}
