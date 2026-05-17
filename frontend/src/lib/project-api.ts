import apiClient from "./api-client";
import type { ProjectInfo } from "@/stores/project-store";

function mapRole(role: string | null | undefined): "PROJECT_OWNER" | "PROJECT_MEMBER" | null {
  if (role === 'OWNER') return 'PROJECT_OWNER';
  if (role === 'MEMBER') return 'PROJECT_MEMBER';
  return null;
}

function mapProjectRoles<T extends { myRole?: string | null }>(data: T): T & { myRole: "PROJECT_OWNER" | "PROJECT_MEMBER" | null } {
  return { ...data, myRole: mapRole(data.myRole) };
}

function mapMemberRoles<T extends { role?: string | null }>(data: T): T & { role: "PROJECT_OWNER" | "PROJECT_MEMBER" } {
  return { ...data, role: mapRole(data.role) as "PROJECT_OWNER" | "PROJECT_MEMBER" };
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  visibility: "PUBLIC" | "PRIVATE";
  ownerId: string;
  ownerName: string;
  myRole: "PROJECT_OWNER" | "PROJECT_MEMBER" | null;
  createdAt: string;
}

export interface ProjectListResponse {
  content: ProjectListItem[];
  totalElements: number;
  totalPages: number;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  visibility: "PUBLIC" | "PRIVATE";
}

export async function getMyProjects(params?: {
  page?: number;
  size?: number;
}): Promise<ProjectListResponse> {
  const res = await apiClient.get("/projects/mine", { params });
  const data = res.data as ProjectListResponse;
  return { ...data, content: (data.content || []).map(mapProjectRoles) };
}

export async function getPublicProjects(params?: {
  page?: number;
  size?: number;
}): Promise<ProjectListResponse> {
  const res = await apiClient.get("/projects/public", { params });
  const data = res.data as ProjectListResponse;
  return { ...data, content: (data.content || []).map(mapProjectRoles) };
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<ProjectInfo> {
  const res = await apiClient.post("/projects", payload);
  return res.data;
}

export async function getProjectDetail(id: string): Promise<ProjectInfo> {
  const res = await apiClient.get(`/projects/${id}`);
  return mapProjectRoles(res.data);
}

export async function updateProject(
  id: string,
  payload: { name?: string; description?: string; visibility?: 'PUBLIC' | 'PRIVATE' },
): Promise<ProjectInfo> {
  const res = await apiClient.put(`/projects/${id}`, payload);
  return res.data;
}

export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/projects/${id}`);
}

export interface ProjectMember {
  id: string;
  userId: string;
  username: string;
  email: string;
  nickname: string;
  avatar: string | null;
  role: "PROJECT_OWNER" | "PROJECT_MEMBER";
  joinedAt: string;
}

export interface ProjectMemberListResponse {
  content: ProjectMember[];
  totalElements: number;
  totalPages: number;
}

export async function getProjectMembers(
  projectId: string,
  params?: { page?: number; size?: number },
): Promise<ProjectMemberListResponse> {
  const res = await apiClient.get(`/projects/${projectId}/members`, { params });
  const data = res.data as ProjectMemberListResponse;
  return { ...data, content: (data.content || []).map(mapMemberRoles) };
}

export async function searchProjectMembers(
  projectId: string,
  keyword: string,
): Promise<ProjectMember[]> {
  const res = await apiClient.get(`/projects/${projectId}/members/search`, {
    params: { keyword },
  });
  return res.data;
}

export async function inviteProjectMember(
  projectId: string,
  username: string,
): Promise<void> {
  await apiClient.post(`/projects/${projectId}/members/invite`, { username });
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: 'PROJECT_OWNER' | 'PROJECT_MEMBER',
): Promise<void> {
  const backendRole = role === 'PROJECT_OWNER' ? 'OWNER' : 'MEMBER';
  await apiClient.put(`/projects/${projectId}/members/${userId}/role`, null, {
    params: { role: backendRole },
  });
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/members/${userId}`);
}
