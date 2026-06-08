import { create } from 'zustand';
import type { Player } from '../types/models';

interface PlayerUiState {
  editingPlayer: Player | null;
  setEditingPlayer: (player: Player | null) => void;
}

export const usePlayerUiStore = create<PlayerUiState>((set) => ({
  editingPlayer: null,
  setEditingPlayer: (player) => set({ editingPlayer: player })
}));
