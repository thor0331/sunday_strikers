import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'light' | 'strong' | 'dark';
  hover?: boolean;
  glow?: 'teal' | 'orange' | 'red' | 'none';
  onClick?: () => void;
}

export function GlassCard({ children, className = '', variant = 'light', hover = false, glow = 'none', onClick }: GlassCardProps) {
  const variants = { light: 'glass', strong: 'glass-strong', dark: 'glass-dark' };
  const glows = { teal: 'glow-teal', orange: 'glow-orange', red: 'glow-red', none: '' };

  return (
    <div
      onClick={onClick}
      className={[
        'rounded-2xl transition-all duration-200',
        variants[variant],
        glows[glow],
        hover ? 'glass-hover cursor-pointer' : '',
        onClick ? 'cursor-pointer' : '',
        className
      ].join(' ')}
    >
      {children}
    </div>
  );
}
