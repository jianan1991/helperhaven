import { create } from 'zustand';
import type { AdminNotification } from './admin';

interface NotificationState {
  notifications: AdminNotification[];
  unreadCount: number;
  setNotifications: (items: AdminNotification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (items) =>
    set({ notifications: items, unreadCount: items.filter((n) => !n.readAt).length }),
}));
