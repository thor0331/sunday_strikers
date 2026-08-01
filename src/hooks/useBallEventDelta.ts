import { useEffect, useRef, useState } from 'react';
import type { BallEvent } from '../types/models';

/**
 * Returns the BallEvents that arrived since the last observed change,
 * comparing by id (falling back to sequenceNumber).
 *
 * UI-only: used purely to trigger premium broadcast animations on new balls.
 * Never used to derive scores.
 */
export function useBallEventDelta(ballEvents: BallEvent[]): BallEvent[] {
  const lastIdRef = useRef<string | null>(null);
  const [delta, setDelta] = useState<BallEvent[]>([]);

  useEffect(() => {
    const sorted = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    let next: BallEvent[] = [];

    if (sorted.length === 0) {
      lastIdRef.current = null;
    } else {
      const last = sorted[sorted.length - 1];

      if (last.id !== lastIdRef.current) {
        if (lastIdRef.current !== null) {
          const idx = sorted.findIndex((e) => e.id === lastIdRef.current);
          if (idx !== -1) {
            // New balls appended after the last observed id.
            next = sorted.slice(idx + 1);
          }
          // Unknown tail (e.g. an undo) — treat as a reset, not a new ball.
        }
        lastIdRef.current = last.id;
      }
    }

    // Bail out with the previous state when nothing changed so callers that
    // hand us a fresh array reference (e.g. a `?? []` default during loading)
    // cannot trigger an infinite re-render loop.
    setDelta((prev) => {
      if (prev.length === 0 && next.length === 0) return prev;
      if (prev.length === next.length && prev.every((e, i) => e.id === next[i].id)) return prev;
      return next;
    });
  }, [ballEvents]);

  return delta;
}
