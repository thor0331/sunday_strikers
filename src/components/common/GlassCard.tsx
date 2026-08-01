import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'light' | 'strong' | 'dark';
  hover?: boolean;
  premium?: boolean;
  glow?: 'teal' | 'orange' | 'red' | 'none';
  onClick?: () => void;
}

export function GlassCard({ children, className = '', variant = 'light', hover = false, premium = false, glow = 'none', onClick }: GlassCardProps) {
  const variants = { light: 'glass', strong: 'glass-strong', dark: 'glass-dark' };
  const glows = { teal: 'glow-teal', orange: 'glow-orange', red: 'glow-red', none: '' };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      className={[
        'rounded-2xl transition-all duration-200',
        variants[variant],
        glows[glow],
        premium ? 'card-premium' : '',
        hover ? 'glass-hover cursor-pointer' : '',
        onClick ? 'cursor-pointer' : '',
        className
      ].join(' ')}
    >
      {children}
    </div>
  );
}
