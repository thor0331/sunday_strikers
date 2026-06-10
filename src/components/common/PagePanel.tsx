import type { ReactNode } from 'react';

interface PagePanelProps {
  title: string;
  children: ReactNode;
}

export function PagePanel({ title, children }: PagePanelProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight text-slate-100">{title}</h2>
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/80 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md hover:border-slate-600/50">{children}</div>
    </section>
  );
}
