import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-white/80',
  success: 'bg-accent-green/15 text-accent-green',
  warning: 'bg-accent-warning/15 text-accent-warning',
  danger: 'bg-accent-danger/15 text-accent-danger',
  info: 'bg-accent-blue/15 text-accent-blue'
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs'
};

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full font-semibold leading-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
