import { motion, MotionConfig } from 'framer-motion';
import type { RecentFormCell } from '../../utils/recentForm';

function cellStyle(cell: RecentFormCell): { box: string; text: string } {
  if (!cell.played) {
    return { box: 'bg-slate-800/60', text: 'text-slate-500' };
  }
  if (cell.rating >= 75) return { box: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]', text: 'text-emerald-50' };
  if (cell.rating >= 50) return { box: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]', text: 'text-amber-950' };
  return { box: 'bg-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.3)]', text: 'text-red-50' };
}

function tooltipText(cell: RecentFormCell): string {
  const base = `${cell.matchName} (${cell.matchDate})`;
  if (!cell.played) return `${base} — Did not play`;
  const dismissal = cell.isOut ? 'out' : 'not out';
  const potm = cell.isPotm ? ' • Player of the Match' : '';
  return `${base} — ${cell.runs} off ${cell.balls} (${dismissal})${potm}`;
}

/**
 * Per-match recent-form heat map: newest match first, gold ring = PoTM,
 * grey = did not play, red/amber/green = form bands.
 */
export function RecentFormHeatmap({ cells }: { cells: RecentFormCell[] }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="flex flex-wrap gap-1.5"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.04 } } }}
      >
        {cells.map((cell) => {
          const style = cellStyle(cell);
          return (
            <motion.div
              key={cell.matchId}
              variants={{
                hidden: { opacity: 0, scale: 0.5 },
                show: { opacity: 1, scale: 1 },
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="group relative"
            >
              <div
                title={tooltipText(cell)}
                className={`flex h-10 w-10 items-center justify-center rounded-md text-xs font-bold tabular-nums ${
                  cell.isPotm ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-[#0B1A2E]' : ''
                } ${style.box} ${style.text}`}
              >
                {cell.played ? cell.runs : '–'}
              </div>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 shadow-xl group-hover:block">
                {tooltipText(cell)}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Great
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Good
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500/80" />Poor
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-800 ring-2 ring-amber-300" />PoTM
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-800/60" />Did not play
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-500">Newest match on the left</p>
    </MotionConfig>
  );
}
