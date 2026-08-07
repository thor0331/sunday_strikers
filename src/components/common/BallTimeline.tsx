import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BallEvent } from '../../types/models';

interface BallTimelineProps {
  ballEvents: BallEvent[];
  playerMap: Map<string, string>;
  showOvers?: number;
  title?: string;
}

function resultLabel(e: BallEvent): { text: string; emoji?: string; className: string } {
  if (e.isWicket) return { text: 'W', className: 'bg-red-500/20 text-red-300 border-red-400/30' };
  if (e.runsBatter === 6) return { text: '6', emoji: '6️⃣', className: 'bg-amber-400/20 text-amber-300 border-amber-400/30' };
  if (e.runsBatter === 4) return { text: '4', emoji: '4️⃣', className: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30' };
  if (e.extraType === 'wide') return { text: 'Wd', className: 'bg-sky-400/20 text-sky-300 border-sky-400/30' };
  if (e.extraType === 'no_ball') return { text: 'Nb', className: 'bg-sky-400/20 text-sky-300 border-sky-400/30' };
  if (e.extraType === 'bye') return { text: 'B', className: 'bg-sky-400/20 text-sky-300 border-sky-400/30' };
  if (e.extraType === 'leg_bye') return { text: 'Lb', className: 'bg-sky-400/20 text-sky-300 border-sky-400/30' };
  if (e.runsExtra > 0) return { text: 'X', className: 'bg-sky-400/20 text-sky-300 border-sky-400/30' };
  if (e.runsBatter === 0) return { text: '.', className: 'bg-white/5 text-slate-400 border-white/10' };
  return { text: String(e.runsBatter), className: 'bg-white/10 text-white border-white/20' };
}

export function BallTimeline({ ballEvents, playerMap, showOvers = 3, title = 'Ball by Ball' }: BallTimelineProps) {
  const grouped = useMemo(() => {
    const sorted = [...ballEvents].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    const overs: { num: number; balls: BallEvent[]; total: number; wickets: number }[] = [];
    for (const e of sorted) {
      let over = overs.find((o) => o.num === e.overNumber);
      if (!over) {
        over = { num: e.overNumber, balls: [], total: 0, wickets: 0 };
        overs.push(over);
      }
      over.balls.push(e);
      over.total += e.runsBatter + e.runsExtra;
      if (e.isWicket) over.wickets += 1;
    }
    return overs.slice(-showOvers);
  }, [ballEvents, showOvers]);

  if (grouped.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</span>
        <span className="text-[10px] font-semibold text-slate-500">{ballEvents.length} balls</span>
      </div>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {grouped.map((over) => (
            <motion.div
              key={over.num}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Over {over.num + 1}
                </span>
                <span className="text-[10px] font-bold text-slate-300 tabular-nums">
                  {over.total} run{over.total !== 1 ? 's' : ''}
                  {over.wickets > 0 && <span className="ml-1 text-red-300">• {over.wickets} wkt</span>}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {over.balls.map((e, bi) => {
                  const res = resultLabel(e);
                  return (
                    <motion.span
                      key={e.id}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: bi * 0.04, duration: 0.22 }}
                      title={e.isWicket
                        ? `Wicket — ${playerMap.get(e.dismissedPlayerId ?? '') ?? 'Batter'} (${e.wicketType ?? ''})`
                        : `Over ${e.overNumber + 1}.${e.ballInOver} — ${res.text}`}
                      className={`inline-flex min-w-8 items-center justify-center rounded-full border px-2 py-1 text-[11px] font-extrabold ${res.className}`}
                    >
                      {res.emoji ?? res.text}
                    </motion.span>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
