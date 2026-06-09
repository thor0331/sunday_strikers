import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

const variants = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 transition-colors',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 transition-colors'
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
