import type { BallEvent } from '../../types/models';
import { isLegalDelivery, totalRunsForBall } from './scoringEngine';

export interface LastOverBall {
  display: string;
  color: string;
  isLegal: boolean;
}

const legendaryColors = {
  dot: 'bg-slate-100 text-slate-600 border-slate-300',
  single: 'bg-teal-100 text-teal-700 border-teal-300',
  double: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  triple: 'bg-blue-100 text-blue-700 border-blue-300',
  four: 'bg-green-100 text-green-700 border-green-300',
  six: 'bg-purple-100 text-purple-700 border-purple-300',
  wicket: 'bg-red-100 text-red-700 border-red-300',
  wide: 'bg-amber-100 text-amber-700 border-amber-300',
  no_ball: 'bg-amber-100 text-amber-700 border-amber-300',
};

export function getLastOverBalls(events: BallEvent[], legalBalls: number): LastOverBall[] {
  if (events.length === 0) return [];
  const lastEvent = events[events.length - 1];
  const currentOverNumber = lastEvent.overNumber;
  const overEvents = events.filter(e => e.overNumber === currentOverNumber);

  return overEvents.map((e) => {
    const isLegal = isLegalDelivery(e);
    const runs = totalRunsForBall(e);

    if (e.isWicket) {
      return { display: 'W', color: legendaryColors.wicket, isLegal };
    }
    if (e.extraType === 'wide') {
      return { display: 'WD', color: legendaryColors.wide, isLegal: false };
    }
    if (e.extraType === 'no_ball') {
      return { display: 'NB', color: legendaryColors.no_ball, isLegal: false };
    }
    if (runs === 0) {
      return { display: '•', color: legendaryColors.dot, isLegal };
    }
    if (runs === 1) {
      return { display: '1', color: legendaryColors.single, isLegal };
    }
    if (runs === 2) {
      return { display: '2', color: legendaryColors.double, isLegal };
    }
    if (runs === 3) {
      return { display: '3', color: legendaryColors.triple, isLegal };
    }
    if (runs === 4) {
      return { display: '4', color: legendaryColors.four, isLegal };
    }
    if (runs === 6) {
      return { display: '6', color: legendaryColors.six, isLegal };
    }
    return { display: `${runs}`, color: legendaryColors.single, isLegal };
  });
}

export function computePartnership(
  events: BallEvent[],
  strikerId: string | null,
  nonStrikerId: string | null
): { runs: number; balls: number } {
  if (!strikerId || !nonStrikerId) return { runs: 0, balls: 0 };

  let partnershipStart = -1;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (
      (e.strikerId === strikerId && e.nonStrikerId === nonStrikerId) ||
      (e.strikerId === nonStrikerId && e.nonStrikerId === strikerId)
    ) {
      if (partnershipStart === -1) partnershipStart = i;
    }
  }

  if (partnershipStart === -1) return { runs: 0, balls: 0 };

  let runs = 0;
  let balls = 0;
  for (let i = partnershipStart; i < events.length; i++) {
    const e = events[i];
    runs += totalRunsForBall(e);
    if (isLegalDelivery(e)) balls++;
  }

  return { runs, balls };
}

export interface CommentaryEntry {
  id: string;
  overDisplay: string;
  bowlerName: string;
  strikerName: string;
  text: string;
  isWicket: boolean;
  isFour: boolean;
  isSix: boolean;
  createdAt: string;
}

export function generateCommentary(
  event: BallEvent,
  playerMap: Map<string, string>
): CommentaryEntry {
  const overDisplay = `${event.overNumber}.${event.ballInOver}`;
  const bowlerName = playerMap.get(event.bowlerId) ?? 'Unknown';
  const strikerName = playerMap.get(event.strikerId) ?? 'Unknown';
  const runs = totalRunsForBall(event);

  let text = '';
  let isWicket = false;
  let isFour = false;
  let isSix = false;

  if (event.isWicket) {
    text = `OUT! ${event.wicketType ? event.wicketType.charAt(0).toUpperCase() + event.wicketType.slice(1) : ''}`;
    if (event.fielderId) {
      const fielderName = playerMap.get(event.fielderId) ?? 'Unknown';
      text += ` c ${fielderName}`;
    }
    isWicket = true;
  } else if (event.extraType === 'wide') {
    text = 'Wide';
  } else if (event.extraType === 'no_ball') {
    text = 'No Ball';
  } else if (event.extraType === 'bye') {
    text = `${runs} Bye${runs > 1 ? 's' : ''}`;
  } else if (event.extraType === 'leg_bye') {
    text = `${runs} Leg Bye${runs > 1 ? 's' : ''}`;
  } else if (event.runsBatter === 4) {
    text = 'FOUR!';
    isFour = true;
  } else if (event.runsBatter === 6) {
    text = 'SIX!';
    isSix = true;
  } else if (event.runsBatter === 0) {
    text = 'No Run';
  } else {
    text = `${event.runsBatter} Run${event.runsBatter > 1 ? 's' : ''}`;
  }

  return {
    id: event.id,
    overDisplay,
    bowlerName,
    strikerName,
    text,
    isWicket,
    isFour,
    isSix,
    createdAt: event.createdAt,
  };
}
