import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

const variants = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 disabled:bg-slate-700/50 disabled:text-slate-500 shadow-sm hover:shadow',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-500 disabled:bg-slate-800/50 disabled:text-slate-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-slate-700/50 disabled:text-slate-500 shadow-sm hover:shadow'
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.97] disabled:active:scale-100 ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
