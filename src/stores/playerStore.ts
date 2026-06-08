import { create } from 'zustand';
import { playerRepository, type PlayerInsert, type PlayerUpdate } from '../repositories/playerRepository';
import type { Player } from '../types/models';

interface PlayerStore {
  players: Player[];
  isLoading: boolean;
  error: string | null;
  fetchPlayers: () => Promise<void>;
  createPlayer: (input: PlayerInsert) => Promise<void>;
  updatePlayer: (id: string, input: PlayerUpdate) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  players: [],
  isLoading: false,
  error: null,
  fetchPlayers: async () => {
    set({ isLoading: true, error: null });
    try {
      set({ players: await playerRepository.list(), isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to fetch players.', isLoading: false });
    }
  },
  createPlayer: async (input) => {
    await playerRepository.create(input);
    await get().fetchPlayers();
  },
  updatePlayer: async (id, input) => {
    await playerRepository.update(id, input);
    await get().fetchPlayers();
  },
  deletePlayer: async (id) => {
    await playerRepository.remove(id);
    await get().fetchPlayers();
  }
}));
