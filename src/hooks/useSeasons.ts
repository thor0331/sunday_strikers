import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { seasonRepository, type SeasonInsert, type SeasonUpdate } from '../repositories/seasonRepository';

export function useSeasons() {
  return useQuery({ queryKey: ['seasons'], queryFn: seasonRepository.list });
}

export function useCreateSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SeasonInsert) => seasonRepository.create(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['seasons'] })
  });
}

export function useUpdateSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SeasonUpdate }) => seasonRepository.update(id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['seasons'] })
  });
}

export function useSetActiveSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => seasonRepository.setActive(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['seasons'] })
  });
}
