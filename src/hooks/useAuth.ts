import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authRepository } from '../repositories/authRepository';

export function useSession() {
  return useQuery({ queryKey: ['session'], queryFn: authRepository.getSession });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authRepository.signIn(email, password),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['session'] })
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authRepository.signOut,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['session'] })
  });
}
