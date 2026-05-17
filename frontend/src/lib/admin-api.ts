import apiClient from './api-client';

export interface AdminUser {
  id: string;
  username: string;
  nickname: string;
  email: string;
  role: 'ADMIN' | 'USER';
  canCreateProject: boolean;
  status: number;
  avatar: string | null;
  loginFailCount: number;
  lockTime: string | null;
  createdAt: string;
}

export interface AdminUserListResponse {
  content: AdminUser[];
  totalElements: number;
  totalPages: number;
}

export async function getAdminUsers(params?: {
  page?: number;
  size?: number;
  keyword?: string;
}): Promise<AdminUserListResponse> {
  const res = await apiClient.get('/admin/users', { params });
  return res.data;
}

export async function updateAdminUserRole(
  userId: string,
  role: 'ADMIN' | 'USER',
): Promise<AdminUser> {
  const res = await apiClient.put(`/admin/users/${userId}/role`, null, {
    params: { role },
  });
  return res.data;
}

export async function toggleAdminUserStatus(
  userId: string,
  status: number,
): Promise<AdminUser> {
  const res = await apiClient.put(`/admin/users/${userId}/status`, null, {
    params: { status },
  });
  return res.data;
}

export async function updateAdminUserCanCreateProject(
  userId: string,
  canCreateProject: number,
): Promise<AdminUser> {
  const res = await apiClient.put(`/admin/users/${userId}/create-project-permission`, null, {
    params: { canCreateProject },
  });
  return res.data;
}

export interface AdminProject {
  id: string;
  name: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  ownerId: string;
  ownerName: string;
  createdAt: string;
}

export interface AdminProjectListResponse {
  content: AdminProject[];
  totalElements: number;
  totalPages: number;
}

export async function getAdminProjects(params?: {
  page?: number;
  size?: number;
}): Promise<AdminProjectListResponse> {
  const res = await apiClient.get('/admin/projects', { params });
  return res.data;
}
