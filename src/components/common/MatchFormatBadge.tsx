import type { MatchFormat } from '../../types/models';

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
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      } ${className}`}
    >
      <span>{'🏏'}</span>
      {isShort ? 'SHORT BOUNDARY' : 'LONG BOUNDARY'}
    </span>
  );
}
