import apiClient from './api-client';
import type { ProjectInfo } from '@/stores/project-store';

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  created_by: string;
  created_at: string;
  my_role: 'PROJECT_OWNER' | 'PROJECT_MEMBER';
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  icon?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
}

/** GET /api/projects — 项目列表（当前用户参与的） */
export async function getMyProjects(): Promise<ProjectListItem[]> {
  const res = await apiClient.get('/projects');
  return res.data;
}

/** GET /api/projects/public — 公开项目列表 */
export async function getPublicProjects(): Promise<ProjectListItem[]> {
  const res = await apiClient.get('/projects/public');
  return res.data;
}

/** POST /api/projects — 创建项目 */
export async function createProject(payload: CreateProjectPayload): Promise<ProjectInfo> {
  const res = await apiClient.post('/projects', payload);
  return res.data;
}

/** GET /api/projects/:id — 项目详情 */
export async function getProjectDetail(id: string): Promise<ProjectInfo> {
  const res = await apiClient.get(`/projects/${id}`);
  return res.data;
}

// ── Members API ──────────────────────────────────────────

export interface ProjectMember {
  id: string;
  user_id: string;
  role: 'PROJECT_OWNER' | 'PROJECT_MEMBER';
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

/** GET /api/projects/:id/members — 项目成员列表 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const res = await apiClient.get(`/projects/${projectId}/members`);
  return res.data;
}

/** GET /api/projects/:id/members/search?q=keyword — 搜索成员（@提及候选） */
export async function searchProjectMembers(
  projectId: string,
  query: string,
): Promise<Array<{ id: string; username: string; name: string; email: string; avatar: string | null }>> {
  const res = await apiClient.get(`/projects/${projectId}/members/search`, {
    params: { q: query },
  });
  return res.data;
}
