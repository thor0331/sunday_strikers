import { create } from 'zustand';

interface AuthState {
  lastEmail: string;
  setLastEmail: (email: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  lastEmail: '',
  setLastEmail: (email) => set({ lastEmail: email })
}));
