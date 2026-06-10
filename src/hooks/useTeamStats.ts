import { useParentMatches } from './useMatches';
import { useMemo } from 'react';
import { computeTeamStats, computeHeadToHead } from '../utils/analytics';

export function useTeamStats(teamSide: 'team_a' | 'team_b') {
  const { data: matches = [] } = useParentMatches();
  return useMemo(() => computeTeamStats(matches, teamSide), [matches, teamSide]);
}

export function useHeadToHead(teamAName: string, teamBName: string) {
  const { data: matches = [] } = useParentMatches();
  return useMemo(() => computeHeadToHead(matches, teamAName, teamBName), [matches, teamAName, teamBName]);
}
