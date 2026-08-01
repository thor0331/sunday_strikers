import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';

export function AvatarViewer() {
  const { isOpen, src, name, subtitle, close } = useAvatarViewerStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg animate-fade-in duration-200"
      onClick={close}
    >
      <button
        onClick={close}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all backdrop-blur-sm border border-white/20"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        className="flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-64 w-64 sm:h-80 sm:w-80 overflow-hidden rounded-full border-4 border-white/50 shadow-2xl animate-scale-in">
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
        <p className="text-white/90 text-lg font-semibold animate-fade-in">{name}</p>
        {subtitle ? (
          <p className="text-white/60 text-sm animate-fade-in -mt-2">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
