import { describe, expect, it } from 'vitest';
import { calculateInningsState, type ScoringContext } from './scoringEngine';
import type { BallEvent } from '../../types/models';

// Real data pulled from the live Supabase database (match `test2`, innings 1).
// These are the exact rows returned by `ballEventsRepository.getBallEvents`.
const REAL_EVENTS: BallEvent[] = [
  { id: '5c8a7e7b-b1c3-44f2-9a4f-b2a8b309d508', matchId: '551af37f-74f2-4d5c-bda1-705349c15351', inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7', sequenceNumber: 1, overNumber: 0, ballInOver: 1, strikerId: '7a23f46e-b9a0-454c-8154-cb7c01369f9b', nonStrikerId: '6980a809-4c9b-497e-8e6c-02eceef70626', bowlerId: '575b2c61-84e7-4939-8308-520e746654bc', runsBatter: 0, runsExtra: 0, extraType: null, isWicket: false, wicketType: null, dismissedPlayerId: null, fielderId: null, isLegalDelivery: true, notes: null, createdBy: null, createdAt: '2026-07-30T11:30:10.2+00:00' },
  { id: '51e7a17a-cc30-4fc6-ac7e-a0ae8beaf4c9', matchId: '551af37f-74f2-4d5c-bda1-705349c15351', inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7', sequenceNumber: 2, overNumber: 0, ballInOver: 2, strikerId: '7a23f46e-b9a0-454c-8154-cb7c01369f9b', nonStrikerId: '6980a809-4c9b-497e-8e6c-02eceef70626', bowlerId: '575b2c61-84e7-4939-8308-520e746654bc', runsBatter: 2, runsExtra: 0, extraType: null, isWicket: false, wicketType: null, dismissedPlayerId: null, fielderId: null, isLegalDelivery: true, notes: null, createdBy: null, createdAt: '2026-07-30T11:30:10.2+00:00' },
  { id: '3988bb0c-86ee-484d-80e4-4b37e2f9f694', matchId: '551af37f-74f2-4d5c-bda1-705349c15351', inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7', sequenceNumber: 3, overNumber: 0, ballInOver: 3, strikerId: '7a23f46e-b9a0-454c-8154-cb7c01369f9b', nonStrikerId: '6980a809-4c9b-497e-8e6c-02eceef70626', bowlerId: '575b2c61-84e7-4939-8308-520e746654bc', runsBatter: 0, runsExtra: 0, extraType: null, isWicket: true, wicketType: 'bowled', dismissedPlayerId: '7a23f46e-b9a0-454c-8154-cb7c01369f9b', fielderId: null, isLegalDelivery: true, notes: null, createdBy: null, createdAt: '2026-07-30T11:30:10.2+00:00' },
  { id: '124193ca-bbfe-46ad-8c31-0b1b9b447b9c', matchId: '551af37f-74f2-4d5c-bda1-705349c15351', inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7', sequenceNumber: 4, overNumber: 0, ballInOver: 4, strikerId: '77ce8c8f-186a-4109-8276-164f5e38721b', nonStrikerId: '6980a809-4c9b-497e-8e6c-02eceef70626', bowlerId: '575b2c61-84e7-4939-8308-520e746654bc', runsBatter: 0, runsExtra: 0, extraType: null, isWicket: true, wicketType: 'bowled', dismissedPlayerId: '77ce8c8f-186a-4109-8276-164f5e38721b', fielderId: null, isLegalDelivery: true, notes: null, createdBy: null, createdAt: '2026-07-30T11:30:10.2+00:00' },
  { id: '85fe0715-3cbb-40b1-b437-8d192a328805', matchId: '551af37f-74f2-4d5c-bda1-705349c15351', inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7', sequenceNumber: 5, overNumber: 0, ballInOver: 5, strikerId: 'e0dc7729-0a0c-4d4f-b7aa-7147c56a4c76', nonStrikerId: '6980a809-4c9b-497e-8e6c-02eceef70626', bowlerId: '575b2c61-84e7-4939-8308-520e746654bc', runsBatter: 4, runsExtra: 0, extraType: null, isWicket: false, wicketType: null, dismissedPlayerId: null, fielderId: null, isLegalDelivery: true, notes: null, createdBy: null, createdAt: '2026-07-30T11:30:10.2+00:00' },
  { id: '5926ec2d-be75-4179-ba24-80d98693de8f', matchId: '551af37f-74f2-4d5c-bda1-705349c15351', inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7', sequenceNumber: 6, overNumber: 0, ballInOver: 6, strikerId: 'e0dc7729-0a0c-4d4f-b7aa-7147c56a4c76', nonStrikerId: '6980a809-4c9b-497e-8e6c-02eceef70626', bowlerId: '575b2c61-84e7-4939-8308-520e746654bc', runsBatter: 0, runsExtra: 0, extraType: null, isWicket: true, wicketType: 'bowled', dismissedPlayerId: 'e0dc7729-0a0c-4d4f-b7aa-7147c56a4c76', fielderId: null, isLegalDelivery: true, notes: null, createdBy: null, createdAt: '2026-07-30T11:30:10.2+00:00' },
  { id: '17e459d6-5487-433a-9ef9-05af516825ba', matchId: '551af37f-74f2-4d5c-bda1-705349c15351', inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7', sequenceNumber: 7, overNumber: 1, ballInOver: 1, strikerId: '6980a809-4c9b-497e-8e6c-02eceef70626', nonStrikerId: '8ee6ea23-ace2-47b4-9869-f5b0c331bbeb', bowlerId: 'a89ac751-6a24-425b-9005-0c9203802a3e', runsBatter: 0, runsExtra: 0, extraType: null, isWicket: true, wicketType: 'bowled', dismissedPlayerId: '6980a809-4c9b-497e-8e6c-02eceef70626', fielderId: null, isLegalDelivery: true, notes: null, createdBy: null, createdAt: '2026-07-30T11:30:10.2+00:00' },
  { id: '626f54f1-7f1e-4e9e-885a-3d8e6fb3ae32', matchId: '551af37f-74f2-4d5c-bda1-705349c15351', inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7', sequenceNumber: 8, overNumber: 1, ballInOver: 2, strikerId: '849f44fa-3c0e-4fe9-897e-ea08444b7e8f', nonStrikerId: '8ee6ea23-ace2-47b4-9869-f5b0c331bbeb', bowlerId: 'a89ac751-6a24-425b-9005-0c9203802a3e', runsBatter: 0, runsExtra: 0, extraType: null, isWicket: true, wicketType: 'bowled', dismissedPlayerId: '849f44fa-3c0e-4fe9-897e-ea08444b7e8f', fielderId: null, isLegalDelivery: true, notes: null, createdBy: null, createdAt: '2026-07-30T11:30:10.2+00:00' }
];

const TEAM_A = ['6980a809-4c9b-497e-8e6c-02eceef70626', '77ce8c8f-186a-4109-8276-164f5e38721b', '7a23f46e-b9a0-454c-8154-cb7c01369f9b', '849f44fa-3c0e-4fe9-897e-ea08444b7e8f', '8ee6ea23-ace2-47b4-9869-f5b0c331bbeb', '92dda3b2-a408-4756-b9d1-2fffac310247', 'e0dc7729-0a0c-4d4f-b7aa-7147c56a4c76'];

// Mirrors the page's exported `determineBattingOrder` exactly.
function determineBattingOrder(squadPlayerIds: string[], ballEvents: BallEvent[], openingStrikerId: string, openingNonStrikerId: string, incomingBatsmanId: string | null): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => {
    if (squadPlayerIds.includes(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  };
  add(openingStrikerId);
  add(openingNonStrikerId);
  const sorted = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  for (const event of sorted) {
    add(event.strikerId);
    add(event.nonStrikerId);
  }
  if (incomingBatsmanId) add(incomingBatsmanId);
  for (const id of squadPlayerIds) add(id);
  return order;
}

describe('LiveScoringPage resume flow (reproduced against real DB data)', () => {
  it('restores full innings state when the active innings has ball events', () => {
    const ballEvents = REAL_EVENTS;
    const firstEvent = ballEvents[0];
    const resolvedOpeningStrikerId = firstEvent.strikerId;
    const resolvedOpeningNonStrikerId = firstEvent.nonStrikerId;
    const incomingBatsmanId: string | null = null;

    const battingOrder = determineBattingOrder(TEAM_A, ballEvents, resolvedOpeningStrikerId, resolvedOpeningNonStrikerId, incomingBatsmanId);
    const context: ScoringContext = {
      inningsId: '45fb92a8-16d7-4150-aa40-9542b4c146b7',
      openingStrikerId: resolvedOpeningStrikerId,
      openingNonStrikerId: resolvedOpeningNonStrikerId,
      battingOrder,
      oversPerInnings: 6,
      playersPerTeam: 6,
      targetRuns: null
    };

    const state = calculateInningsState(context, ballEvents);

    expect(state.totalRuns).toBe(6);
    expect(state.wickets).toBe(5);
    expect(state.oversDisplay).toBe('1.2');
    expect(state.strikerId).toBe('92dda3b2-a408-4756-b9d1-2fffac310247');
    expect(state.nonStrikerId).toBe('8ee6ea23-ace2-47b4-9869-f5b0c331bbeb');
    expect(state.currentBowlerId).toBe('a89ac751-6a24-425b-9005-0c9203802a3e');
    expect(state.isAllOut).toBe(true);
    expect(state.isCompleted).toBe(true);
  });

  it('derives null state (page shows 0/0, no players) when the active innings has no ball events', () => {
    const ballEvents: BallEvent[] = [];
    const firstEvent: BallEvent | null = ballEvents[0] ?? null;
    const resolvedOpeningStrikerId = firstEvent?.strikerId || '';
    const resolvedOpeningNonStrikerId = firstEvent?.nonStrikerId || '';

    let state: ReturnType<typeof calculateInningsState> | null = null;
    if (resolvedOpeningStrikerId && resolvedOpeningNonStrikerId) {
      const battingOrder = determineBattingOrder(TEAM_A, ballEvents, resolvedOpeningStrikerId, resolvedOpeningNonStrikerId, null);
      const context: ScoringContext = {
        inningsId: '7d6c7026-8c37-4c11-9c56-a20de5f65332',
        openingStrikerId: resolvedOpeningStrikerId,
        openingNonStrikerId: resolvedOpeningNonStrikerId,
        battingOrder,
        oversPerInnings: 6,
        playersPerTeam: 6,
        targetRuns: 7
      };
      state = calculateInningsState(context, ballEvents);
    }

    expect(state).toBeNull();
  });
});
