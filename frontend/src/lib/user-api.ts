import apiClient from './api-client';

export interface UserPreferences {
  emailNotification: number;
  deadlineReminder: number;
  overdueWarning: number;
  statusChangeNotify: number;
  mentionNotify: number;
  memberChangeNotify: number;
}

export interface UserProfile {
  id: string;
  username: string;
  nickname: string;
  email: string;
  avatar: string | null;
  role: string;
  canCreateProject: number;
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await apiClient.get('/users/me');
  return res.data;
}

export async function updateUserProfile(data: { nickname?: string; oldPassword?: string; newPassword?: string }): Promise<UserProfile> {
  const res = await apiClient.put('/users/me', data);
  return res.data;
}

export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getPreferences(): Promise<UserPreferences> {
  const res = await apiClient.get('/users/me/preferences');
  return res.data;
}

export async function updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await apiClient.put('/users/me/preferences', prefs);
  return res.data;
}
