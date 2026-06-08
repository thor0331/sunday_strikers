import type { MatchInsert } from '../types/models';
import { matchRepository } from '../repositories/matchRepository';

export async function createMatch(input: MatchInsert) {
  return matchRepository.create(input);
}

export async function startSuperOver(parentMatchId: string, input: Omit<MatchInsert, 'parent_match_id' | 'is_super_over' | 'overs_per_innings'>) {
  return matchRepository.startSuperOver(parentMatchId, input);
}

export async function fetchMatchHistory() {
  return matchRepository.history();
}
