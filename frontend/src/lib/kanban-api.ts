import apiClient from './api-client';
import type {
  BoardResponse,
  CreateColumnRequest,
  DeleteColumnRequest,
  ReorderColumnsRequest,
  ReorderTasksRequest,
  UpdateTaskStatusRequest,
} from '@/types/kanban';

export const fetchBoard = (projectId: string) =>
  apiClient.get<BoardResponse>(`/projects/${projectId}/board`).then((r) => r.data);

export const createColumn = (projectId: string, data: CreateColumnRequest) =>
  apiClient.post(`/projects/${projectId}/columns`, data).then((r) => r.data);

export const updateColumn = (columnId: string, data: Partial<CreateColumnRequest>) =>
  apiClient.put(`/columns/${columnId}`, data).then((r) => r.data);

export const deleteColumn = (columnId: string, data: DeleteColumnRequest) =>
  apiClient.delete(`/columns/${columnId}`, { data }).then((r) => r.data);

export const reorderColumns = (data: ReorderColumnsRequest) =>
  apiClient.put('/columns/reorder', data).then((r) => r.data);

export const reorderTasks = (columnId: string, data: ReorderTasksRequest) =>
  apiClient.put(`/columns/${columnId}/tasks/reorder`, data).then((r) => r.data);

export const updateTaskStatus = (taskId: string, data: UpdateTaskStatusRequest) =>
  apiClient.put(`/tasks/${taskId}/status`, data).then((r) => r.data);
