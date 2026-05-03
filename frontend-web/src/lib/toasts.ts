import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  link?: string;
}

interface ToastState {
  toasts: Toast[];
  totalUnread: number;
  push: (message: string, link?: string) => void;
  dismiss: (id: string) => void;
  setTotalUnread: (n: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  totalUnread: 0,
  push: (message, link) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, link }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setTotalUnread: (n) => set({ totalUnread: n }),
}));
