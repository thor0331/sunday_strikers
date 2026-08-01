import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { X } from 'lucide-react';

type ChipVariant = 'filled' | 'outlined';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ChipVariant;
  onRemove?: () => void;
  className?: string;
}

const variantStyles: Record<ChipVariant, string> = {
  filled: 'bg-white/10 text-white',
  outlined: 'border border-white/20 text-white/80'
};

export function Chip({ children, variant = 'filled', onRemove, className = '', ...props }: ChipProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-colors ${variantStyles[variant]} ${className}`}>
      <button className="inline-flex items-center gap-1" {...props}>
        {children}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove"
          className="-mr-0.5 ml-0.5 inline-flex rounded-full p-0.5 transition-colors hover:bg-white/20"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
