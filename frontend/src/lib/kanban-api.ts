import apiClient from './api-client';
import type {
  BoardResponse,
  CreateColumnRequest,
  ColumnSortRequest,
} from '@/types/kanban';

export const fetchBoard = (projectId: string) =>
  apiClient.get<BoardResponse>(`/projects/${projectId}/board`).then((r) => r.data);

export const createColumn = (projectId: string, data: CreateColumnRequest) =>
  apiClient.post(`/projects/${projectId}/board/columns`, data).then((r) => r.data);

export const updateColumn = (columnId: string, data: Partial<CreateColumnRequest>) =>
  apiClient.put(`/columns/${columnId}`, data).then((r) => r.data);

export const deleteColumn = (columnId: string) =>
  apiClient.delete(`/columns/${columnId}`).then((r) => r.data);

export const sortColumns = (projectId: string, data: ColumnSortRequest) =>
  apiClient.put(`/projects/${projectId}/board/columns/sort`, data).then((r) => r.data);

export const sortTasksInColumn = (columnId: string, taskIds: string[]) =>
  apiClient.put(`/columns/${columnId}/tasks/sort`, taskIds).then((r) => r.data);

export const updateTaskStatus = (taskId: string, data: { columnId: string; status: string }) =>
  apiClient.put(`/tasks/${taskId}/status`, data).then((r) => r.data);
