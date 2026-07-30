import { useEffect, useRef } from 'react';
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
      <input className={`min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${className}`} {...props} />
    </FieldShell>
  );
}

export function TextAreaField({ label, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <FieldShell label={label}>
      <textarea className={`min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${className}`} {...props} />
    </FieldShell>
  );
}

export function SelectField({ label, className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const selectRef = useRef<HTMLSelectElement | null>(null);

  // Log on every render
  useEffect(() => {
    if (selectRef.current) {
      console.log('[SELECTFIELD] Rendered select element. tagName:', selectRef.current.tagName, 'type:', (selectRef.current as HTMLSelectElement).type, 'value prop:', props.value, 'has onChange:', typeof props.onChange === 'function');
    }
  });

  // Track mount/unmount of this SelectField instance + native change listener
  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const key = props.value ?? '(no value)';
    const mountId = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    console.log('[SELECTFIELD:LIFECYCLE] MOUNT key=', key, 'mountId=', mountId);
    console.log('[SELECTFIELD:LIFECYCLE] element in DOM:', document.contains(el));

    const handleNativeChange = (e: Event) => {
      const target = e.target as HTMLSelectElement;
      console.log('[SELECTFIELD:NATIVE] change event. target.value:', target.value, 'target.tagName:', target.tagName, 'target === el:', target === el);
      console.log('[SELECTFIELD:NATIVE] element still in DOM:', document.contains(target));
    };

    el.addEventListener('change', handleNativeChange);
    console.log('[SELECTFIELD:ADDED] native change listener');

    return () => {
      console.log('[SELECTFIELD:LIFECYCLE] UNMOUNT key=', key, 'mountId=', mountId);
      console.log('[SELECTFIELD:LIFECYCLE] element in DOM at unmount:', document.contains(el));
      console.log('[SELECTFIELD:LIFECYCLE] element parent:', el.parentElement?.tagName);
      el.removeEventListener('change', handleNativeChange);
      console.log('[SELECTFIELD:REMOVED] native change listener');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally no deps — runs once per mount

  return (
    <FieldShell label={label}>
      <select
        ref={selectRef}
        className={`min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
