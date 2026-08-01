import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Zap, Flame, Undo2, Trophy } from 'lucide-react';
import { useToastStore, type ToastType } from '../../stores/toastStore';

const toastConfig: Record<ToastType, { icon: React.ReactNode; ring: string; glow: string; iconColor: string }> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    ring: 'border-emerald-400/30',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.25)]',
    iconColor: 'text-emerald-300'
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    ring: 'border-red-400/30',
    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.25)]',
    iconColor: 'text-red-300'
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    ring: 'border-sky-400/30',
    glow: 'shadow-[0_0_24px_rgba(56,189,248,0.2)]',
    iconColor: 'text-sky-300'
  },
  boundary: {
    icon: <Zap className="h-4 w-4" />,
    ring: 'border-emerald-400/40',
    glow: 'shadow-[0_0_28px_rgba(16,185,129,0.35)]',
    iconColor: 'text-emerald-300'
  },
  six: {
    icon: <Flame className="h-4 w-4" />,
    ring: 'border-amber-400/40',
    glow: 'shadow-[0_0_28px_rgba(245,158,11,0.35)]',
    iconColor: 'text-amber-300'
  },
  wicket: {
    icon: <Zap className="h-4 w-4" />,
    ring: 'border-red-400/40',
    glow: 'shadow-[0_0_28px_rgba(239,68,68,0.35)]',
    iconColor: 'text-red-300'
  },
  undo: {
    icon: <Undo2 className="h-4 w-4" />,
    ring: 'border-white/20',
    glow: 'shadow-[0_0_20px_rgba(148,163,184,0.2)]',
    iconColor: 'text-slate-300'
  },
  match: {
    icon: <Trophy className="h-4 w-4" />,
    ring: 'border-violet-400/40',
    glow: 'shadow-[0_0_28px_rgba(139,92,246,0.35)]',
    iconColor: 'text-violet-300'
  }
};

export function ToastContainer() {
  const { toasts, hide } = useToastStore();

  return (
    <div className="fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center gap-3 rounded-2xl border ${config.ring} bg-[#0d1a2e]/95 px-4 py-3 backdrop-blur-xl ${config.glow}`}
            >
              <span className={`shrink-0 ${config.iconColor}`}>{config.icon}</span>
              <span className="flex-1 text-sm font-semibold text-white">{toast.message}</span>
              <button
                onClick={() => hide(toast.id)}
                aria-label="Dismiss notification"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
