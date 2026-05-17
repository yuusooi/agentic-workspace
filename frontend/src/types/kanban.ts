export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectRole = 'PROJECT_OWNER' | 'PROJECT_MEMBER';

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

export interface TaskAssigneeUser {
  id: string;
  user_id: string;
  name: string;
  avatar: string | null;
}

export interface Task {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  position: number;
  version: number;
  assignees: TaskAssigneeUser[];
  tags: TaskTag[];
  ai_generated: boolean;
}

export interface BoardColumn {
  id: string;
  project_id: string;
  name: string;
  status_mapping: TaskStatus;
  position: number;
  is_default: boolean;
  color: string;
  tasks: Task[];
}

export interface BoardResponse {
  my_role: ProjectRole;
  columns: BoardColumn[];
}

export interface CreateColumnRequest {
  name: string;
  status_mapping: TaskStatus;
  color: string;
}

export interface DeleteColumnRequest {
  target_column_id: string;
}

export interface ReorderColumnsRequest {
  column_orders: Array<{ id: string; position: number }>;
}

export interface ReorderTasksRequest {
  task_orders: Array<{ task_id: string; position: number }>;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  column_id: string;
}
