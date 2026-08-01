import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PagePanelProps {
  title: string;
  children: ReactNode;
}

export function PagePanel({ title, children }: PagePanelProps) {
  return (
    <motion.section
      className="space-y-3"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-slate-100">
        <span className="inline-block h-5 w-1 rounded-full bg-gradient-to-b from-teal-400 to-emerald-500" />
        {title}
      </h2>
      <div className="card-premium p-4">{children}</div>
    </motion.section>
  );
}
