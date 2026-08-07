import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { dialogOverlay, dialogContent } from './animations';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className = '' }: DialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
          variants={dialogOverlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-label={title ?? 'Dialog'}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={dialogOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            className={`relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0F1B2D]/95 shadow-2xl backdrop-blur-xl sm:rounded-[18px] ${className}`}
            variants={dialogContent}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="mx-auto mt-1.5 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" />
            {title && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 pb-3 pt-4 md:px-6 md:pb-4 md:pt-5">
                <h2 className="min-w-0 truncate text-lg font-bold text-white">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="tap-target -mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
