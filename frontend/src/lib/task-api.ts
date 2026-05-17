import apiClient from './api-client';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

export interface TaskAssignee {
  userId: string;
  nickname: string;
  avatar: string | null;
}

export interface TaskAttachment {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  uploaderId: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  parentId: string | null;
  createdAt: string;
  replies?: TaskComment[];
}

export interface TaskStatusHistory {
  id: string;
  taskId: string;
  oldStatus: TaskStatus | null;
  newStatus: TaskStatus;
  changedBy: string;
  changedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  columnId: string;
  columnName: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  sortOrder: number;
  dueDate: string | null;
  creatorId: string;
  creatorName: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  tags: TaskTag[];
  assignees: TaskAssignee[];
}

export interface TaskDetail extends Task {
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  statusHistory?: TaskStatusHistory[];
}

export interface TaskListParams {
  projectId?: string;
  columnId?: string;
  page?: number;
  size?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  keyword?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export interface CreateTaskPayload {
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeIds?: string[];
  tagIds?: string[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  columnId?: string;
  sortOrder?: number;
  dueDate?: string | null;
  version?: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
}

export async function getTasks(
  params?: TaskListParams,
): Promise<PaginatedResponse<Task>> {
  const res = await apiClient.get('/tasks', { params });
  return res.data;
}

export async function createTask(
  payload: CreateTaskPayload,
): Promise<Task> {
  const res = await apiClient.post('/tasks', payload);
  return res.data;
}

export async function getTaskDetail(taskId: string): Promise<TaskDetail> {
  const res = await apiClient.get(`/tasks/${taskId}`);
  return res.data;
}

export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  const res = await apiClient.put(`/tasks/${taskId}`, payload);
  return res.data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}

export async function updateTaskStatus(
  taskId: string,
  columnId: string,
  status: TaskStatus,
): Promise<Task> {
  const res = await apiClient.put(`/tasks/${taskId}/status`, { columnId, status });
  return res.data;
}

export async function addAssignees(
  taskId: string,
  userIds: string[],
): Promise<void> {
  await apiClient.post(`/tasks/${taskId}/assignees`, userIds);
}

export async function removeAssignee(
  taskId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/assignees/${userId}`);
}

export async function setTaskTags(
  taskId: string,
  tagIds: string[],
): Promise<void> {
  await apiClient.put(`/tasks/${taskId}/tags`, tagIds);
}

export async function getTaskComments(
  taskId: string,
  params?: { page?: number; size?: number },
): Promise<PaginatedResponse<TaskComment>> {
  const res = await apiClient.get(`/tasks/${taskId}/comments`, { params });
  return res.data;
}

export async function addTaskComment(
  taskId: string,
  content: string,
  parentId?: string,
): Promise<TaskComment> {
  const res = await apiClient.post(`/tasks/${taskId}/comments`, { content, parentId: parentId || undefined });
  return res.data;
}

export async function getTaskHistory(
  taskId: string,
  params?: { page?: number; size?: number },
): Promise<PaginatedResponse<TaskStatusHistory>> {
  const res = await apiClient.get(`/tasks/${taskId}/status-history`, { params });
  return res.data;
}

export async function uploadAttachment(
  taskId: string,
  file: File,
): Promise<TaskAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/tasks/attachments/${attachmentId}`);
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export async function getProjectTags(projectId: string): Promise<Tag[]> {
  const res = await apiClient.get(`/projects/${projectId}/tags`);
  return res.data;
}

export async function createProjectTag(
  projectId: string,
  payload: { name: string; color?: string },
): Promise<Tag> {
  const res = await apiClient.post(`/projects/${projectId}/tags`, payload);
  return res.data;
}

export async function deleteProjectTag(
  projectId: string,
  tagId: string,
): Promise<void> {
  await apiClient.delete(`/projects/${projectId}/tags/${tagId}`);
}

export const priorityConfig: Record<
  TaskPriority,
  { label: string; color: string }
> = {
  URGENT: { label: '紧急', color: '#0075de' },
  HIGH: { label: '高', color: '#615d59' },
  MEDIUM: { label: '中', color: '#a39e98' },
  LOW: { label: '低', color: '#a39e98' },
};

export const statusConfig: Record<
  TaskStatus,
  { label: string; color: string }
> = {
  TODO: { label: '待办', color: '#a39e98' },
  IN_PROGRESS: { label: '进行中', color: '#0075de' },
  DONE: { label: '已完成', color: '#1aae39' },
};
