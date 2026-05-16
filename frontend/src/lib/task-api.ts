import apiClient from './api-client';

// ── Types ──────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

export interface TaskAssignee {
  id: string;
  name: string;
  avatar: string | null;
}

export interface TaskAttachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface TaskStatusHistory {
  id: string;
  task_id: string;
  old_status: TaskStatus | null;
  new_status: TaskStatus;
  changed_by: string;
  changed_at: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface Task {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  description: string;
  ai_summary: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  position: number;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: TaskTag[];
  assignees: TaskAssignee[];
  attachments: TaskAttachment[];
}

export interface TaskDetail extends Task {
  comments: TaskComment[];
  status_history: TaskStatusHistory[];
}

export interface TaskListParams {
  page?: number;
  size?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  keyword?: string;
  overdue?: boolean;
  sort?: 'deadline' | 'priority' | 'created_at';
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string | null;
  estimated_hours?: number | null;
  column_id?: string;
  assignee_ids?: string[];
  tag_ids?: string[];
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  status?: TaskStatus;
  column_id?: string;
  version: number;
}

// ── API Functions ──────────────────────────────────────

/** GET /api/projects/:id/tasks — 任务列表（分页、筛选、排序） */
export async function getTasks(
  projectId: string,
  params?: TaskListParams,
): Promise<PaginatedResponse<Task>> {
  const res = await apiClient.get(`/projects/${projectId}/tasks`, { params });
  return res.data;
}

/** POST /api/projects/:id/tasks — 创建任务 */
export async function createTask(
  projectId: string,
  payload: CreateTaskPayload,
): Promise<Task> {
  const res = await apiClient.post(`/projects/${projectId}/tasks`, payload);
  return res.data;
}

/** GET /api/tasks/:id — 任务详情 */
export async function getTaskDetail(taskId: string): Promise<TaskDetail> {
  const res = await apiClient.get(`/tasks/${taskId}`);
  return res.data;
}

/** PUT /api/tasks/:id — 更新任务（乐观锁：需传 version） */
export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  const res = await apiClient.put(`/tasks/${taskId}`, payload);
  return res.data;
}

/** DELETE /api/tasks/:id — 删除任务（PROJECT_OWNER） */
export async function deleteTask(taskId: string): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}`);
}

/** PUT /api/tasks/:id/status — 更新状态 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  await apiClient.put(`/tasks/${taskId}/status`, { status });
}

/** POST /api/tasks/:id/assignees — 添加负责人 */
export async function addAssignee(
  taskId: string,
  userId: string,
): Promise<void> {
  await apiClient.post(`/tasks/${taskId}/assignees`, { user_id: userId });
}

/** DELETE /api/tasks/:id/assignees/:userId — 移除负责人 */
export async function removeAssignee(
  taskId: string,
  userId: string,
): Promise<void> {
  await apiClient.delete(`/tasks/${taskId}/assignees/${userId}`);
}

/** PUT /api/tasks/:id/tags — 设置标签 */
export async function setTaskTags(
  taskId: string,
  tagIds: string[],
): Promise<void> {
  await apiClient.put(`/tasks/${taskId}/tags`, { tag_ids: tagIds });
}

/** GET /api/tasks/:id/comments — 进度列表 */
export async function getTaskComments(
  taskId: string,
): Promise<TaskComment[]> {
  const res = await apiClient.get(`/tasks/${taskId}/comments`);
  return res.data;
}

/** POST /api/tasks/:id/comments — 添加进度 */
export async function addTaskComment(
  taskId: string,
  content: string,
): Promise<TaskComment> {
  const res = await apiClient.post(`/tasks/${taskId}/comments`, { content });
  return res.data;
}

/** GET /api/tasks/:id/history — 状态变更历史 */
export async function getTaskHistory(
  taskId: string,
): Promise<TaskStatusHistory[]> {
  const res = await apiClient.get(`/tasks/${taskId}/history`);
  return res.data;
}

/** POST /api/tasks/:id/attachments — 上传附件 */
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

/** DELETE /api/attachments/:id — 删除附件 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/attachments/${attachmentId}`);
}

// ── Tag API ────────────────────────────────────────────

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

/** GET /api/projects/:id/tags — 项目标签列表 */
export async function getProjectTags(projectId: string): Promise<Tag[]> {
  const res = await apiClient.get(`/projects/${projectId}/tags`);
  return res.data;
}

/** POST /api/projects/:id/tags — 创建标签 */
export async function createProjectTag(
  projectId: string,
  payload: { name: string; color?: string },
): Promise<Tag> {
  const res = await apiClient.post(`/projects/${projectId}/tags`, payload);
  return res.data;
}

// ── Priority helpers ───────────────────────────────────

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
