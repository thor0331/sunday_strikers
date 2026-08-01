import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}

export function Topbar({ title, subtitle, onBack, actions, className = '' }: TopbarProps) {
  const navigate = useNavigate();

  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <header className={`sticky top-0 z-30 border-b border-white/10 bg-[#07111F]/80 backdrop-blur-xl ${className}`}>
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="inline-flex rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">{title}</h1>
          {subtitle && <p className="text-xs text-slate-300">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
