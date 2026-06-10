interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="text-5xl mb-4 opacity-70">{icon}</div>
      <h3 className="text-lg font-bold text-slate-700 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-xs">{description}</p>}
      {action && (
        <a
          href={action.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all btn-press"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
