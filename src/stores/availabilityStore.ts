import { create } from 'zustand';
import { availabilityRepository, type AvailabilityStatus } from '../repositories/availabilityRepository';
import type { Availability, Match } from '../types/models';

interface AvailabilityStore {
  matches: Match[];
  availability: Availability[];
  fetchMatches: () => Promise<void>;
  fetchAvailability: (matchId: string) => Promise<void>;
  markAvailability: (matchId: string, playerId: string, status: AvailabilityStatus, note?: string | null) => Promise<void>;
}

export const useAvailabilityStore = create<AvailabilityStore>((set, get) => ({
  matches: [],
  availability: [],
  fetchMatches: async () => {
    set({ matches: await availabilityRepository.listMatchesForAvailability() });
  },
  fetchAvailability: async (matchId) => {
    set({ availability: await availabilityRepository.listForMatch(matchId) });
  },
  markAvailability: async (matchId, playerId, status, note) => {
    await availabilityRepository.setStatus(matchId, playerId, status, note);
    await get().fetchAvailability(matchId);
  }
}));
