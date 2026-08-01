import { useEffect, useMemo, useState } from 'react';
import type { BallEvent, DerivedInningsState } from '../../types/models';
import { playSound } from '../../utils/sound';

export type BroadcastEventKind = 'runs' | 'four' | 'six' | 'wicket' | 'milestone';

export interface BroadcastEvent {
  id: number;
  kind: BroadcastEventKind;
  title: string;
  subtitle?: string;
}

let broadcastEventId = 0;

const TEAM_MILESTONES = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

/**
 * Pure classification of newly arrived balls into premium broadcast banners.
 * Derives milestone triggers from engine-produced `DerivedInningsState`
 * (never re-derives scores itself).
 */
export function classifyBroadcastEvents(delta: BallEvent[], state: DerivedInningsState): BroadcastEvent[] {
  const events: BroadcastEvent[] = [];
  if (delta.length === 0) return events;

  const safeDelta = delta.filter(
  (e): e is BallEvent => e !== undefined && e !== null
);

const deltaRuns = safeDelta.reduce(
  (sum, e) => sum + (e.runsBatter ?? 0) + (e.runsExtra ?? 0),
  0
);

  // Team run milestones (50, 100, ...) crossed by this batch.
  const prevTotal = Math.max(state.totalRuns - deltaRuns, 0);
  for (const t of TEAM_MILESTONES) {
    if (prevTotal < t && state.totalRuns >= t) {
      events.push({ id: ++broadcastEventId, kind: 'milestone', title: `${t} UP`, subtitle: 'Team total' });
    }
  }

  // Partnership milestones (only when no wicket reset the pair mid-batch).
  const hasWicket = safeDelta.some((e) => e.isWicket);
  if (!hasWicket && state.strikerId && state.nonStrikerId) {
    const current = (state.battingStats[state.strikerId]?.runs ?? 0) + (state.battingStats[state.nonStrikerId]?.runs ?? 0);
    const previous = current - deltaRuns;
    if (previous < 50 && current >= 50) {
      events.push({ id: ++broadcastEventId, kind: 'milestone', title: '50 UP', subtitle: 'Partnership' });
    } else if (previous < 100 && current >= 100) {
      events.push({ id: ++broadcastEventId, kind: 'milestone', title: '100 UP', subtitle: 'Partnership' });
    }
  }

  // Latest ball classification — primary banner.
const latest = safeDelta.at(-1);

if (!latest) {
  console.warn("Broadcast: latest ball event is undefined", {
    deltaLength: delta.length,
    delta,
  });

  return events;
}
console.log("Broadcast Debug", {
    delta,
    safeDelta,
    latest,
    deltaLength: delta.length,
    safeLength: safeDelta.length
});
const runs = latest.runsBatter + latest.runsExtra;
  if (latest.isWicket) {
    events.push({ id: ++broadcastEventId, kind: 'wicket', title: 'WICKET', subtitle: latest.wicketType ?? undefined });
  } else if (latest.runsBatter === 6) {
    events.push({ id: ++broadcastEventId, kind: 'six', title: 'SIX' });
  } else if (latest.runsBatter === 4) {
    events.push({ id: ++broadcastEventId, kind: 'four', title: 'FOUR' });
  } else if (runs > 0) {
    events.push({ id: ++broadcastEventId, kind: 'runs', title: `+${runs}` });
  }

  return events;
}

const TONE_STYLES: Record<BroadcastEventKind, { box: string; text: string }> = {
  runs: { box: 'border-teal-400/40 bg-slate-900/80 shadow-teal-500/30', text: 'text-teal-300' },
  four: { box: 'border-cyan-400/50 bg-slate-900/80 shadow-cyan-500/30', text: 'text-cyan-300' },
  six: { box: 'border-amber-400/60 bg-slate-900/80 shadow-amber-500/40', text: 'text-amber-300' },
  wicket: { box: 'border-red-500/60 bg-slate-900/85 shadow-red-500/40', text: 'text-red-400' },
  milestone: { box: 'border-emerald-400/50 bg-slate-900/80 shadow-emerald-500/30', text: 'text-emerald-300' },
};

export function BroadcastOverlays({
  delta,
  state,
}: {
  delta: BallEvent[];
  state: DerivedInningsState | null;
}) {
  const [active, setActive] = useState<BroadcastEvent | null>(null);

  const events = useMemo(() => (state ? classifyBroadcastEvents(delta, state) : []), [delta, state]);

  useEffect(() => {
    if (events.length === 0) return;
    const last = events[events.length - 1];
    setActive(last);
    if (last.kind === 'four') playSound('boundary');
    else if (last.kind === 'six') playSound('six');
    else if (last.kind === 'wicket') playSound('wicket');
    const timer = window.setTimeout(() => setActive(null), 1500);
    return () => window.clearTimeout(timer);
  }, [events]);

  if (!active) return null;

  const tone = TONE_STYLES[active.kind];

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center overflow-hidden" aria-hidden="true">
      <div
        key={active.id}
        className={`animate-broadcast-banner mt-[20vh] rounded-2xl border px-8 py-5 text-center shadow-2xl backdrop-blur-xl motion-reduce:animate-none ${tone.box}`}
      >
        <p className={`text-5xl font-extrabold tracking-tight sm:text-6xl ${tone.text}`}>{active.title}</p>
        {active.subtitle && (
          <p className={`mt-1 text-xs font-bold uppercase tracking-[0.2em] opacity-80 ${tone.text}`}>{active.subtitle}</p>
        )}
      </div>
    </div>
  );
}
