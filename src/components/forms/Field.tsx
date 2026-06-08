import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  children: ReactNode;
}

function FieldShell({ label, children }: FieldShellProps) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextField({ label, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <FieldShell label={label}>
      <input className={`min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-field focus:ring-2 focus:ring-teal-100 ${className}`} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({ label, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <FieldShell label={label}>
      <textarea className={`min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-field focus:ring-2 focus:ring-teal-100 ${className}`} {...props} />
    </FieldShell>
  );
}

export function SelectField({ label, className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <FieldShell label={label}>
      <select className={`min-h-11 rounded-md border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-field focus:ring-2 focus:ring-teal-100 ${className}`} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}
