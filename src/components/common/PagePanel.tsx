import type { ReactNode } from 'react';

interface PagePanelProps {
  title: string;
  children: ReactNode;
}

export function PagePanel({ title, children }: PagePanelProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-normal text-slate-100">{title}</h2>
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">{children}</div>
    </section>
  );
}
