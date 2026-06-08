import type { ReactNode } from 'react';

interface PagePanelProps {
  title: string;
  children: ReactNode;
}

export function PagePanel({ title, children }: PagePanelProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-normal text-ink">{title}</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
    </section>
  );
}
