import { create } from 'zustand';
import { matchRepository, type MatchInsert, type TeamAssignment, type TossInput } from '../repositories/matchRepository';
import type { Match } from '../types/models';

interface MatchStore {
  matches: Match[];
  currentMatch: Match | null;
  fetchMatches: () => Promise<void>;
  fetchMatch: (matchId: string) => Promise<void>;
  createMatch: (input: MatchInsert) => Promise<Match>;
  saveTeams: (matchId: string, assignments: TeamAssignment[]) => Promise<void>;
  conductToss: (matchId: string, input: TossInput) => Promise<void>;
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  matches: [],
  currentMatch: null,
  fetchMatches: async () => {
    set({ matches: await matchRepository.list() });
  },
  fetchMatch: async (matchId) => {
    set({ currentMatch: await matchRepository.get(matchId) });
  },
  createMatch: async (input) => {
    const match = await matchRepository.create(input);
    await get().fetchMatches();
    return match;
  },
  saveTeams: async (matchId, assignments) => {
    await matchRepository.saveTeams(matchId, assignments);
    await get().fetchMatch(matchId);
  },
  conductToss: async (matchId, input) => {
    await matchRepository.conductToss(matchId, input);
    await get().fetchMatch(matchId);
  }
}));
