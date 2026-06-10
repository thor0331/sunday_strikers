import type { ReactNode } from 'react';

interface PagePanelProps {
  title: string;
  children: ReactNode;
}

export function PagePanel({ title, children }: PagePanelProps) {
  return (
    <section className="space-y-3 animate-fade-in">
      <h2 className="text-xl font-bold tracking-tight text-slate-800">{title}</h2>
      <div className="glass glass-hover rounded-2xl p-5">{children}</div>
    </section>
  );
}
