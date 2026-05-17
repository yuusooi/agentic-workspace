export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectRole = 'PROJECT_OWNER' | 'PROJECT_MEMBER';

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

export interface TaskAssigneeUser {
  userId: string;
  nickname: string;
  avatar: string | null;
}

export interface KanbanTask {
  id: string;
  projectId: string;
  columnId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  sortOrder: number;
  version: number;
  assignees: TaskAssigneeUser[];
  tags: TaskTag[];
}

export interface BoardColumn {
  id: string;
  name: string;
  sortOrder: number;
  statusMapping: TaskStatus;
  createdAt: string;
  tasks: KanbanTask[];
}

export interface CreateColumnRequest {
  name: string;
  statusMapping?: TaskStatus;
}

export interface ColumnSortRequest {
  columns: Array<{ columnId: string; sortOrder: number }>;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  columnId: string;
}
