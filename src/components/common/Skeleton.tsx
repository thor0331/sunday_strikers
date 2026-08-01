interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-5 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.22)]">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i % 2 === 0 ? 'w-full' : 'w-3/4'}`} style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="border-b border-white/10 px-4 py-3">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: rows }).map((_, r) => (
              <Skeleton key={r} className="h-6 w-full" style={{ animationDelay: `${(c * rows + r) * 80}ms` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonScorecard() {
  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1].map((t) => (
            <div key={t} className="flex items-center justify-between rounded-xl bg-white/[0.04] p-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[18px]" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  );
}
