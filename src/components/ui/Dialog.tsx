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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            className={`relative w-full max-w-lg rounded-[18px] border border-white/10 bg-[#0F1B2D]/95 p-6 shadow-2xl backdrop-blur-xl ${className}`}
            variants={dialogContent}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="rounded-full p-1.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
