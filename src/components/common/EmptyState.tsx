interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/30 to-emerald-500/20 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full glass ring-1 ring-white/10 text-4xl shadow-xl">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-bold text-white mb-1.5">{title}</h3>
      {description && <p className="text-sm text-slate-300 max-w-xs leading-relaxed">{description}</p>}
      {action && (
        <a
          href={action.href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all btn-press"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
