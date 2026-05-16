import apiClient from './api-client';

export type NotificationType =
  | 'DEADLINE_REMINDER'
  | 'OVERDUE'
  | 'STATUS_CHANGE'
  | 'MENTION'
  | 'MEMBER_CHANGE'
  | 'AI_OPERATION';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  entity_type: 'TASK' | 'PROJECT' | null;
  entity_id: string | null;
  created_at: string;
  actor: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

export interface NotificationListResponse {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function getNotifications(
  params?: { page?: number; size?: number },
): Promise<NotificationListResponse> {
  const res = await apiClient.get('/notifications', { params });
  return res.data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.put(`/notifications/${notificationId}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await apiClient.put('/notifications/read-all');
}
