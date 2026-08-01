import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

interface FieldShellProps {
  label: string;
  error?: string;
  children: ReactNode;
}

function FieldShell({ label, error, children }: FieldShellProps) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-white/80">
      <span className="px-1">{label}</span>
      {children}
      {error && <span className="px-1 text-xs text-accent-danger">{error}</span>}
    </label>
  );
}

export function TextField({ label, error, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <FieldShell label={label} error={error}>
      <input
        className={`h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-accent-green/50 focus:bg-white/10 focus:ring-2 focus:ring-accent-green/20 ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({ label, error, className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  return (
    <FieldShell label={label} error={error}>
      <textarea
        className={`min-h-24 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-accent-green/50 focus:bg-white/10 focus:ring-2 focus:ring-accent-green/20 ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

interface SelectOption {
  value: string;
  label: string;
  disabled: boolean;
}

function optionNodeToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(optionNodeToText).join('');
  if (isValidElement(node)) return optionNodeToText(node.props.children);
  return '';
}

function parseSelectOptions(children: ReactNode): SelectOption[] {
  const items: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== 'option') return;
    items.push({
      value: child.props.value == null ? '' : String(child.props.value),
      label: optionNodeToText(child.props.children),
      disabled: Boolean(child.props.disabled)
    });
  });
  return items;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function SelectField({ label, error, className = '', children, value, onChange, required, disabled, name, id, form }: SelectFieldProps) {
  const items = useMemo(() => parseSelectOptions(children), [children]);
  const currentValue = value == null ? '' : String(value);
  const selected = items.find((i) => i.value === currentValue) ?? items.find((i) => i.value === '');

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const emitChange = (nextValue: string) => {
    if (!onChange) return;
    onChange({ target: { value: nextValue } } as unknown as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = Math.min(256, items.length * 40 + 16);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    setCoords({
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 180),
      openUp
    });
    setOpen(true);
  };

  const toggleMenu = () => {
    if (disabled) return;
    if (open) {
      setOpen(false);
      triggerRef.current?.focus();
    } else {
      openMenu();
    }
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleMenu();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openMenu();
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const dir = event.key === 'ArrowDown' ? 1 : -1;
      setHighlight((h) => {
        let idx = h;
        for (let step = 0; step < items.length; step += 1) {
          idx = (idx + dir + items.length) % items.length;
          if (!items[idx].disabled) return idx;
        }
        return h;
      });
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = items[highlight];
      if (item && !item.disabled) emitChange(item.value);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    const selectedIndex = items.findIndex((i) => i.value === currentValue && !i.disabled);
    setHighlight(selectedIndex >= 0 ? selectedIndex : items.findIndex((i) => !i.disabled));
  }, [open, items, currentValue]);

  useEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight;
      if ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0)) {
        event.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleResize = () => setOpen(false);
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  return (
    <div className="grid gap-1.5 text-sm font-medium text-white/80">
      {label && <span className="px-1">{label}</span>}
      <div ref={rootRef} className="relative">
        <select
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          value={currentValue}
          onChange={onChange}
          required={required}
          disabled={disabled}
          name={name}
          id={id}
          form={form}
        >
          {children}
        </select>

        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={toggleMenu}
          onKeyDown={handleTriggerKeyDown}
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-2xl border px-4 text-white outline-none transition-all duration-200 focus:border-accent-green/50 focus:ring-2 focus:ring-accent-green/20 ${
            open ? 'border-accent-green/50 bg-white/10 ring-2 ring-accent-green/20' : 'border-white/10 bg-white/5'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/10'} ${
            selected && selected.value !== '' ? 'text-white' : 'text-slate-400'
          } ${className}`}
        >
          <span className="truncate">{selected?.label || 'Select…'}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {error && <span className="px-1 text-xs text-accent-danger">{error}</span>}
      </div>

      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <div
              className="fixed z-[60]"
              style={{ top: coords.top, left: coords.left, width: coords.width, transform: coords.openUp ? 'translateY(-100%)' : undefined }}
            >
              <motion.div
                initial={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <ul
                  ref={menuRef}
                  role="listbox"
                  tabIndex={-1}
                  onKeyDown={handleMenuKeyDown}
                  style={{ overscrollBehavior: 'contain' }}
                  className={`max-h-60 overflow-auto overscroll-contain rounded-2xl border border-white/10 bg-[#0F1B2D]/95 p-1.5 shadow-2xl backdrop-blur-xl outline-none custom-scrollbar ${coords.openUp ? 'mb-2' : 'mt-2'}`}
                >
                  {items.map((item, index) => (
                    <li key={`${item.value}-${index}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={item.value === currentValue}
                        disabled={item.disabled}
                        onClick={() => emitChange(item.value)}
                        onMouseEnter={() => setHighlight(index)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                          item.disabled
                            ? 'cursor-not-allowed text-slate-400'
                            : item.value === currentValue
                              ? 'bg-accent-green/20 text-accent-green ring-1 ring-inset ring-accent-green/40'
                              : highlight === index
                                ? 'bg-accent-green/15 text-white shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                                : 'text-white/70 hover:bg-accent-green/15 hover:text-white hover:shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                        }`}
                      >
                        <span className="truncate">{item.label || 'Select…'}</span>
                        {item.value === currentValue && <Check className="h-4 w-4 shrink-0 text-accent-green" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
