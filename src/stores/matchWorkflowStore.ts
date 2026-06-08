import { create } from 'zustand';
import type { TeamSide } from '../types/models';

interface MatchWorkflowState {
  selectedMatchId: string | null;
  teamACaptainId: string | null;
  teamBCaptainId: string | null;
  teamAssignments: Record<string, TeamSide | null>;
  setSelectedMatchId: (matchId: string | null) => void;
  setCaptains: (teamACaptainId: string | null, teamBCaptainId: string | null) => void;
  setPlayerTeam: (playerId: string, team: TeamSide | null) => void;
  resetTeams: () => void;
}

export const useMatchWorkflowStore = create<MatchWorkflowState>((set) => ({
  selectedMatchId: null,
  teamACaptainId: null,
  teamBCaptainId: null,
  teamAssignments: {},
  setSelectedMatchId: (matchId) => set({ selectedMatchId: matchId }),
  setCaptains: (teamACaptainId, teamBCaptainId) => set({ teamACaptainId, teamBCaptainId }),
  setPlayerTeam: (playerId, team) =>
    set((state) => ({
      teamAssignments: { ...state.teamAssignments, [playerId]: team }
    })),
  resetTeams: () => set({ teamAssignments: {} })
}));
