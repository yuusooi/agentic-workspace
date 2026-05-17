import apiClient from './api-client';

export interface UserPreferences {
  email_notification: boolean;
  deadline_reminder: boolean;
  mention_notification: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string | null;
  preferences: UserPreferences;
}

export async function getUserProfile(): Promise<UserProfile> {
  const res = await apiClient.get('/users/me');
  return res.data;
}

export async function updateUserProfile(data: { name?: string }): Promise<void> {
  await apiClient.put('/users/me', data);
}

export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await apiClient.post('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getPreferences(): Promise<UserPreferences> {
  const res = await apiClient.get('/users/me/preferences');
  return res.data;
}

export async function updatePreferences(prefs: Partial<UserPreferences>): Promise<void> {
  await apiClient.put('/users/me/preferences', prefs);
}
