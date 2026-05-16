import { create } from 'zustand';
import * as notificationApi from '@/lib/notification-api';

interface NotificationState {
  unreadCount: number;
  notifications: notificationApi.Notification[];
  loading: boolean;
  currentPage: number;
  totalPages: number;

  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (page?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  loading: false,
  currentPage: 0,
  totalPages: 0,

  fetchUnreadCount: async () => {
    try {
      const { count } = await notificationApi.getUnreadCount();
      set({ unreadCount: count });
    } catch {
      // silent
    }
  },

  fetchNotifications: async (page = 0) => {
    set({ loading: true });
    try {
      const res = await notificationApi.getNotifications({ page, size: 20 });
      set({
        notifications: res.content,
        currentPage: res.number,
        totalPages: res.totalPages,
        loading: false,
      });
      await get().fetchUnreadCount();
    } catch {
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // silent
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch {
      // silent
    }
  },
}));
