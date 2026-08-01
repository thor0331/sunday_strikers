import { useEffect, useMemo, useRef, useState } from 'react';
import type { BallEvent, DerivedInningsState } from '../types/models';
import {
  buildSpectatorNotifications,
  detectMatchWon,
  type SpectatorNotification,
} from '../utils/spectatorNotifications';
import { playSound } from '../utils/sound';

const TOAST_DURATION_MS = 3200;

export interface UseSpectatorNotificationsInput {
  delta: BallEvent[];
  ballEvents: BallEvent[];
  state: DerivedInningsState | null;
  playerMap: Map<string, string>;
  resultText: string | null | undefined;
}

/**
 * UI-only live notification queue for spectator views. Newly arrived balls
 * (via the delta) become toasts that auto-dismiss; a "MATCH WON" toast fires
 * once when the match result text transitions from empty to set.
 */
export function useSpectatorNotifications(
  input: UseSpectatorNotificationsInput
): SpectatorNotification[] {
  const [queue, setQueue] = useState<SpectatorNotification[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());
  const prevResultRef = useRef<string | null | undefined>(input.resultText);

  const fresh = useMemo(
    () => buildSpectatorNotifications(input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.delta, input.ballEvents, input.state, input.playerMap]
  );

  useEffect(() => {
    const notifications: SpectatorNotification[] = [...fresh];

    const prevResult = prevResultRef.current;
    const curResult = input.resultText;
    if (!prevResult && curResult) {
      const won = detectMatchWon(curResult);
      if (won) {
        playSound('victory');
        notifications.push(won);
      }
    }
    prevResultRef.current = curResult;

    if (notifications.length === 0) return;

    setQueue((q) => [...q, ...notifications]);
    for (const n of notifications) {
      const timer = window.setTimeout(() => {
        setQueue((q) => q.filter((x) => x.id !== n.id));
        timersRef.current.delete(n.id);
      }, TOAST_DURATION_MS);
      timersRef.current.set(n.id, timer);
    }
  }, [fresh, input.resultText]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
    };
  }, []);

  return queue;
}
