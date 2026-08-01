import { create } from 'zustand';

interface SoundState {
  muted: boolean;
  toggleMuted: () => void;
  setMuted: (muted: boolean) => void;
}

export const useSoundStore = create<SoundState>((set) => ({
  muted: true,
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  setMuted: (muted) => set({ muted }),
}));
