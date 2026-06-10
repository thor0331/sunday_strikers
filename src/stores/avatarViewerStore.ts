import { create } from 'zustand';

interface AvatarViewerState {
  isOpen: boolean;
  src: string | null;
  name: string;
  open: (src: string, name: string) => void;
  close: () => void;
}

export const useAvatarViewerStore = create<AvatarViewerState>((set) => ({
  isOpen: false,
  src: null,
  name: '',
  open: (src, name) => set({ isOpen: true, src, name }),
  close: () => set({ isOpen: false }),
}));
