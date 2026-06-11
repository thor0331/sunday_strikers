import { create } from 'zustand';

interface AvatarViewerState {
  isOpen: boolean;
  src: string | null;
  name: string;
  subtitle: string;
  open: (src: string, name: string, subtitle?: string) => void;
  close: () => void;
}

export const useAvatarViewerStore = create<AvatarViewerState>((set) => ({
  isOpen: false,
  src: null,
  name: '',
  subtitle: '',
  open: (src, name, subtitle = '') => set({ isOpen: true, src, name, subtitle }),
  close: () => set({ isOpen: false }),
}));
