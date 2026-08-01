import type { BallEvent, DerivedInningsState } from '../types/models';
import { isLegalDelivery } from '../domain/scoring/scoringEngine';

export type SpectatorNotificationKind =
  | 'runs'
  | 'four'
  | 'six'
  | 'wicket'
  | 'batter-milestone'
  | 'hat-trick'
  | 'partnership'
  | 'team-milestone'
  | 'match-won';

export interface SpectatorNotification {
  id: string;
  kind: SpectatorNotificationKind;
  title: string;
  body: string;
}

export interface SpectatorNotificationInput {
  /** Fresh ball events since the last observed change (the UI-only trigger). */
  delta: BallEvent[];
  /** Full ball history for the active innings, newest at the end. */
  ballEvents: BallEvent[];
  /** Engine-produced current innings state (never re-derived here). */
  state: DerivedInningsState | null;
  playerMap: Map<string, string>;
}

const TEAM_MILESTONES = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
const BATTER_MILESTONES = [50, 100];
const PARTNERSHIP_MILESTONES = [50, 100];

/**
 * UI-only ordering: the latest ball's headline first, then supporting
 * milestones. The toast queue renders this order newest-on-top.
 */
const KIND_ORDER: Record<SpectatorNotificationKind, number> = {
  wicket: 0,
  six: 1,
  'hat-trick': 2,
  'batter-milestone': 3,
  'team-milestone': 4,
  partnership: 5,
  four: 6,
  runs: 7,
  'match-won': 0,
};

let notificationSeq = 0;

function makeNotification(kind: SpectatorNotificationKind, title: string, body: string): SpectatorNotification {
  notificationSeq += 1;
  return { id: `sn-${kind}-${notificationSeq}`, kind, title, body };
}

function playerName(playerMap: Map<string, string>, playerId: string | null | undefined): string {
  return playerId ? (playerMap.get(playerId) ?? 'Unknown') : 'Unknown';
}

function classifyHatTrick(sortedLegal: BallEvent[]): string | null {
  if (sortedLegal.length < 3) return null;
  const lastThree = sortedLegal.slice(-3);
  const bowlerId = lastThree[0].bowlerId;
  if (lastThree.every((e) => e.isWicket && e.bowlerId === bowlerId)) return bowlerId;
  return null;
}

/**
 * Pure spectator notification factory. Consumes only the engine-produced
 * innings state plus a UI-only delta of newly arrived balls; it never
 * re-derives scores.
 */
export function buildSpectatorNotifications(input: SpectatorNotificationInput): SpectatorNotification[] {
  const { delta, ballEvents, state, playerMap } = input;
  if (delta.length === 0 || !state) return [];

  const events: SpectatorNotification[] = [];
  const deltaRuns = delta.reduce((sum, e) => sum + e.runsBatter + e.runsExtra, 0);
  const prevTotal = Math.max(state.totalRuns - deltaRuns, 0);
  const hasWicket = delta.some((e) => e.isWicket);

  // Team run milestones crossed by this batch.
  for (const t of TEAM_MILESTONES) {
    if (prevTotal < t && state.totalRuns >= t) {
      events.push(makeNotification('team-milestone', `${t} UP`, 'Team total'));
    }
  }

  // Batter milestones crossed on a ball within this batch.
  const batterRunsInDelta = new Map<string, number>();
  for (const e of delta) {
    batterRunsInDelta.set(e.strikerId, (batterRunsInDelta.get(e.strikerId) ?? 0) + e.runsBatter);
  }
  for (const [playerId, runs] of batterRunsInDelta) {
    if (runs <= 0) continue;
    const current = state.battingStats[playerId]?.runs ?? 0;
    const previous = current - runs;
    for (const m of BATTER_MILESTONES) {
      if (previous < m && current >= m) {
        events.push(
          makeNotification('batter-milestone', m === 50 ? 'FIFTY' : 'CENTURY', playerName(playerMap, playerId))
        );
      }
    }
  }

  // Partnership milestones (only when no wicket reset the pair mid-batch).
  if (!hasWicket && state.strikerId && state.nonStrikerId) {
    const current =
      (state.battingStats[state.strikerId]?.runs ?? 0) + (state.battingStats[state.nonStrikerId]?.runs ?? 0);
    const previous = current - deltaRuns;
    for (const m of PARTNERSHIP_MILESTONES) {
      if (previous < m && current >= m) {
        events.push(makeNotification('partnership', `${m} UP`, 'Partnership'));
      }
    }
  }

  const latest = delta[delta.length - 1];
  const sortedLegal = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber).filter(isLegalDelivery);
  const hatTrickBowler = classifyHatTrick(sortedLegal);
  if (latest.isWicket && hatTrickBowler && hatTrickBowler === latest.bowlerId) {
    events.push(makeNotification('hat-trick', 'HAT-TRICK', playerName(playerMap, hatTrickBowler)));
  }

  // Latest ball classification — headline notification.
  const runs = latest.runsBatter + latest.runsExtra;
  if (latest.isWicket) {
    events.push(
      makeNotification(
        'wicket',
        'WICKET',
        latest.dismissedPlayerId
          ? playerName(playerMap, latest.dismissedPlayerId)
          : playerName(playerMap, latest.strikerId)
      )
    );
  } else if (latest.runsBatter === 6) {
    events.push(makeNotification('six', 'SIX', playerName(playerMap, latest.strikerId)));
  } else if (latest.runsBatter === 4) {
    events.push(makeNotification('four', 'FOUR', playerName(playerMap, latest.strikerId)));
  } else if (runs > 0) {
    events.push(makeNotification('runs', `+${runs}`, playerName(playerMap, latest.strikerId)));
  }

  return events.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
}

/** Builds a one-off "match won" notification from the match result text. */
export function detectMatchWon(resultText: string | null | undefined): SpectatorNotification | null {
  if (!resultText) return null;
  return makeNotification('match-won', 'MATCH WON', resultText);
}
