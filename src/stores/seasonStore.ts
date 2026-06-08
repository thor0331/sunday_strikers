import { create } from 'zustand';
import { seasonRepository, type SeasonInsert, type SeasonUpdate } from '../repositories/seasonRepository';
import type { Season } from '../types/models';

interface SeasonStore {
  seasons: Season[];
  activeSeason: Season | null;
  fetchSeasons: () => Promise<void>;
  createSeason: (input: SeasonInsert) => Promise<void>;
  updateSeason: (id: string, input: SeasonUpdate) => Promise<void>;
  setActiveSeason: (id: string) => Promise<void>;
}

export const useSeasonStore = create<SeasonStore>((set, get) => ({
  seasons: [],
  activeSeason: null,
  fetchSeasons: async () => {
    const seasons = await seasonRepository.list();
    set({ seasons, activeSeason: seasons.find((season) => season.is_active) ?? null });
  },
  createSeason: async (input) => {
    await seasonRepository.create(input);
    await get().fetchSeasons();
  },
  updateSeason: async (id, input) => {
    await seasonRepository.update(id, input);
    await get().fetchSeasons();
  },
  setActiveSeason: async (id) => {
    await seasonRepository.setActive(id);
    await get().fetchSeasons();
  }
}));
