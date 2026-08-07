/**
 * Unique-ID factory.
 *
 * Every test creates its OWN data using a globally unique tag so that no two
 * runs (or two parallel workers) can ever collide in the shared Supabase DB.
 *
 * names look like:  QA-<label>-1750000000000-8k3p9
 */
export const RUN_ID = Date.now();

/** Short worker/process salt to keep parallel workers isolated. */
const SALT = Math.random().toString(36).slice(2, 7);

/** Per-call sequence so every generated name within a worker is distinct. */
let SEQ = 0;

/**
 * Build a unique identifier for a QA resource.
 * `label` should be a short noun, e.g. "Season", "Match", "Player".
 */
export function unique(label: string): string {
  return `QA-${label}-${RUN_ID}-${SALT}-${SEQ++}`;
}

/**
 * Convenience tagged names. Every spec should derive at least its own
 * season + match name from these so DB verification + cleanup can locate them.
 */
export const qaSeasonName = (): string => unique('Season');
export const qaMatchName = (): string => unique('Match');
export const qaPlayerName = (): string => unique('Player');
export const qaGroupName = (): string => unique('Group');

/** Today in YYYY-MM-DD (UTC) for date fields. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}