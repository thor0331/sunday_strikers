import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAvatarViewerStore } from '../../stores/avatarViewerStore';

export function AvatarViewer() {
  const { isOpen, src, name, close } = useAvatarViewerStore();

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={close}
    >
      <button
        onClick={close}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        className="flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-64 w-64 sm:h-80 sm:w-80 overflow-hidden rounded-full border-4 border-white/50 shadow-2xl">
          <img src={src} alt={name} className="h-full w-full object-cover" />
        </div>
        <p className="text-white/90 text-lg font-semibold">{name}</p>
      </div>
    </div>
  );
}
