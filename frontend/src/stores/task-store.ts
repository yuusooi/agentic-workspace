import { create } from 'zustand';
import type {
  Task,
  TaskDetail,
  TaskListParams,
  TaskStatus,
  TaskPriority,
  Tag,
} from '@/lib/task-api';

// ── Types ──────────────────────────────────────────────

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee_id?: string;
  keyword?: string;
  overdue?: boolean;
  sort?: 'deadline' | 'priority' | 'created_at';
}

interface TaskState {
  /** Task list (paginated) */
  tasks: Task[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  loading: boolean;

  /** Current task detail */
  currentTask: TaskDetail | null;
  detailLoading: boolean;

  /** Drawer state */
  drawerOpen: boolean;
  drawerMode: 'view' | 'create' | 'edit';

  /** Filters */
  filter: TaskFilter;

  /** Project tags (for tag selector) */
  projectTags: Tag[];

  // ── Actions ──
  setTasks: (tasks: Task[], total: number, totalPages: number) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setCurrentTask: (task: TaskDetail | null) => void;
  setDetailLoading: (loading: boolean) => void;
  openDrawer: (mode: 'view' | 'create' | 'edit', task?: TaskDetail) => void;
  closeDrawer: () => void;
  setFilter: (filter: Partial<TaskFilter>) => void;
  resetFilter: () => void;
  setProjectTags: (tags: Tag[]) => void;

  /** Optimistically update a task in the list */
  updateTaskInList: (taskId: string, updates: Partial<Task>) => void;
  removeTaskFromList: (taskId: string) => void;
  addTaskToList: (task: Task) => void;
}

const defaultFilter: TaskFilter = {
  sort: 'created_at',
};

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  totalElements: 0,
  totalPages: 0,
  currentPage: 0,
  pageSize: 20,
  loading: false,

  currentTask: null,
  detailLoading: false,

  drawerOpen: false,
  drawerMode: 'view',

  filter: { ...defaultFilter },
  projectTags: [],

  setTasks: (tasks, total, totalPages) =>
    set({ tasks, totalElements: total, totalPages }),

  setPage: (page) => set({ currentPage: page }),

  setPageSize: (size) => set({ pageSize: size, currentPage: 0 }),

  setLoading: (loading) => set({ loading }),

  setCurrentTask: (task) => set({ currentTask: task }),

  setDetailLoading: (loading) => set({ detailLoading: loading }),

  openDrawer: (mode, task) =>
    set({ drawerOpen: true, drawerMode: mode, currentTask: task ?? null }),

  closeDrawer: () =>
    set({ drawerOpen: false, drawerMode: 'view', currentTask: null }),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
      currentPage: 0,
    })),

  resetFilter: () => set({ filter: { ...defaultFilter }, currentPage: 0 }),

  setProjectTags: (tags) => set({ projectTags: tags }),

  updateTaskInList: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t,
      ),
    })),

  removeTaskFromList: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      totalElements: state.totalElements - 1,
    })),

  addTaskToList: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
      totalElements: state.totalElements + 1,
    })),
}));

// ── Selector helpers ───────────────────────────────────

export function buildQueryParams(state: {
  filter: TaskFilter;
  currentPage: number;
  pageSize: number;
}): TaskListParams {
  const { filter, currentPage, pageSize } = state;
  const params: TaskListParams = {
    page: currentPage,
    size: pageSize,
  };
  if (filter.status) params.status = filter.status;
  if (filter.priority) params.priority = filter.priority;
  if (filter.assignee_id) params.assignee_id = filter.assignee_id;
  if (filter.keyword) params.keyword = filter.keyword;
  if (filter.overdue) params.overdue = true;
  if (filter.sort) params.sort = filter.sort;
  return params;
}
