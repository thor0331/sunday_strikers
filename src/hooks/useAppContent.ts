import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appContentRepository, type AppContentUpdate } from '../repositories/appContentRepository';

export function useAppContent(key: string) {
  return useQuery({
    queryKey: ['app_content', key],
    queryFn: () => appContentRepository.getByKey(key)
  });
}

export function useUpdateAppContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AppContentUpdate }) =>
      appContentRepository.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['app_content'] });
    }
  });
}

export function useCreateDefaultContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => appContentRepository.createDefaultAboutPage(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['app_content'] });
    }
  });
}

export function useUploadDeveloperPhoto() {
  return useMutation({
    mutationFn: (file: File) => appContentRepository.uploadDeveloperPhoto(file)
  });
}

export function useUploadPhoto() {
  return useMutation({
    mutationFn: ({ file, folder, filename }: { file: File; folder: string; filename: string }) =>
      appContentRepository.uploadPhoto(file, folder, filename)
  });
}

export function useDeleteDeveloperPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => appContentRepository.deleteDeveloperPhoto(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['app_content'] });
    }
  });
}
