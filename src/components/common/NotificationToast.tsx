import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Activity, Award, Crown, Flame, Sparkles, TrendingUp, Trophy, XCircle, Zap, type LucideIcon } from 'lucide-react';
import type { SpectatorNotification, SpectatorNotificationKind } from '../../utils/spectatorNotifications';

interface ToastStyle {
  box: string;
  text: string;
  icon: LucideIcon;
}

const KIND_STYLES: Record<SpectatorNotificationKind, ToastStyle> = {
  runs: { box: 'border-teal-400/40 bg-slate-900/90', text: 'text-teal-300', icon: Activity },
  four: { box: 'border-cyan-400/50 bg-slate-900/90', text: 'text-cyan-300', icon: Zap },
  six: { box: 'border-amber-400/60 bg-slate-900/90', text: 'text-amber-300', icon: Flame },
  wicket: { box: 'border-red-500/60 bg-slate-900/95', text: 'text-red-400', icon: XCircle },
  'batter-milestone': { box: 'border-emerald-400/50 bg-slate-900/90', text: 'text-emerald-300', icon: Crown },
  'hat-trick': { box: 'border-fuchsia-400/60 bg-slate-900/95', text: 'text-fuchsia-300', icon: Sparkles },
  partnership: { box: 'border-emerald-400/40 bg-slate-900/90', text: 'text-emerald-300', icon: TrendingUp },
  'team-milestone': { box: 'border-emerald-400/50 bg-slate-900/90', text: 'text-emerald-300', icon: Award },
  'match-won': { box: 'border-amber-400/70 bg-slate-900/95 shadow-amber-500/20', text: 'text-amber-300', icon: Trophy },
};

const MAX_VISIBLE = 5;

/**
 * Top-right live notification queue for spectator views. Pure presentation:
 * ordering and content come from `useSpectatorNotifications`.
 */
export function NotificationToast({ notifications }: { notifications: SpectatorNotification[] }) {
  const reduceMotion = useReducedMotion();
  const visible = notifications.slice(-MAX_VISIBLE).reverse();

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed right-4 top-16 z-[55] flex w-[calc(100%-2rem)] max-w-xs flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {visible.map((n) => {
          const style = KIND_STYLES[n.kind];
          const Icon = style.icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: reduceMotion ? 0 : 48, scale: reduceMotion ? 1 : 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : 48, transition: { duration: 0.22 } }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`flex items-start gap-3 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl ${style.box}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.text}`} />
              <div className="min-w-0">
                <p className={`text-sm font-extrabold tracking-wide ${style.text}`}>{n.title}</p>
                {n.body && <p className="truncate text-xs text-slate-300">{n.body}</p>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
