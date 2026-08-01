import { create } from 'zustand';

export type ToastType =
  | 'success'
  | 'error'
  | 'info'
  | 'boundary'
  | 'six'
  | 'wicket'
  | 'undo'
  | 'match';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, type: ToastType) => void;
  hide: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  hide: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
