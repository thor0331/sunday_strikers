interface MatchFormatBadgeProps {
  format: string | null;
  className?: string;
}

export function MatchFormatBadge({ format, className = '' }: MatchFormatBadgeProps) {
  const isShort = !format || format === 'short_boundary';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
        isShort
          ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
          : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
      } ${className}`}
    >
      <span>{'🏏'}</span>
      {isShort ? 'SHORT BOUNDARY' : 'LONG BOUNDARY'}
    </span>
  );
}
