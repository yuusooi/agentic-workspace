import apiClient from './api-client';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  can_create_project: boolean;
  is_active: boolean;
  avatar: string | null;
  created_at: string;
}

export interface AdminUserListResponse {
  content: AdminUser[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
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
): Promise<void> {
  await apiClient.put(`/admin/users/${userId}/role`, { role });
}

export async function toggleAdminUserStatus(
  userId: string,
  isActive: boolean,
): Promise<void> {
  await apiClient.put(`/admin/users/${userId}/status`, { is_active: isActive });
}

export async function updateAdminUserCanCreateProject(
  userId: string,
  canCreateProject: boolean,
): Promise<void> {
  await apiClient.put(`/admin/users/${userId}/can-create-project`, {
    can_create_project: canCreateProject,
  });
}

export interface AdminProject {
  id: string;
  name: string;
  description: string;
  icon: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  created_by: string;
  created_at: string;
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  };
  member_count: number;
  task_count: number;
}

export interface AdminProjectListResponse {
  content: AdminProject[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function getAdminProjects(params?: {
  page?: number;
  size?: number;
  keyword?: string;
}): Promise<AdminProjectListResponse> {
  const res = await apiClient.get('/admin/projects', { params });
  return res.data;
}
