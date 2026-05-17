import apiClient from './api-client';

export type NotificationType =
  | 'DEADLINE_REMINDER'
  | 'OVERDUE_WARNING'
  | 'STATUS_CHANGED'
  | 'MENTION'
  | 'ASSIGNEE_CHANGED'
  | 'AI_OPERATION'
  | 'HEALTH_WARNING';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: number;
  relatedType: 'TASK' | 'PROJECT' | null;
  relatedId: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  content: Notification[];
  totalElements: number;
  totalPages: number;
}

export async function getNotifications(
  params?: { page?: number; size?: number },
): Promise<NotificationListResponse> {
  const res = await apiClient.get('/notifications', { params });
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.put(`/notifications/${notificationId}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.put('/notifications/read-all');
}
