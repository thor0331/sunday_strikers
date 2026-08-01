import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-gradient-to-br from-accent-green to-emerald-600 text-white shadow-lg shadow-accent-green/20 hover:shadow-accent-green/30',
  secondary:
    'bg-white/10 text-white border border-white/10 hover:bg-white/20',
  ghost:
    'text-white/60 hover:text-white hover:bg-white/10',
  danger:
    'bg-gradient-to-br from-accent-danger to-red-600 text-white shadow-lg shadow-accent-danger/20 hover:shadow-accent-danger/30'
};

const sizeStyles: Record<string, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-12 px-7 text-base gap-2.5 rounded-2xl'
};

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }: ButtonProps) {
  return (
    <motion.button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      whileHover={!disabled ? { scale: 1.02, transition: { duration: 0.15 } } : undefined}
      whileTap={!disabled ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}
