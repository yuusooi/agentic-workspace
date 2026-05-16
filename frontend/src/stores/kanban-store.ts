import { create } from 'zustand';
import { message } from 'antd';
import type { BoardColumn, ProjectRole, TaskStatus, Task } from '@/types/kanban';
import * as kanbanApi from '@/lib/kanban-api';

/* ──── Mock data (delete after backend is ready) ──── */
const USE_MOCK = true;

const MOCK_TASKS: Record<string, Task[]> = {
  'col-1': [
    { id: 't1', project_id: 'p1', column_id: 'col-1', title: '设计数据库 ER 图', status: 'TODO', priority: 'HIGH', deadline: '2026-05-10T00:00:00Z', position: 0, version: 1, ai_generated: false, tags: [{ id: 'tg1', name: '数据库', color: 'blue' }], assignees: [{ id: 'a1', user_id: 'u1', name: '张', avatar: null }] },
    { id: 't2', project_id: 'p1', column_id: 'col-1', title: '用户注册接口开发', status: 'TODO', priority: 'URGENT', deadline: '2026-05-20T00:00:00Z', position: 1, version: 1, ai_generated: true, tags: [{ id: 'tg2', name: '后端', color: 'green' }, { id: 'tg3', name: '用户', color: 'purple' }], assignees: [{ id: 'a2', user_id: 'u2', name: '李', avatar: null }, { id: 'a3', user_id: 'u3', name: '王', avatar: null }] },
    { id: 't3', project_id: 'p1', column_id: 'col-1', title: '编写单元测试', status: 'TODO', priority: 'MEDIUM', deadline: null, position: 2, version: 1, ai_generated: false, tags: [], assignees: [] },
  ],
  'col-2': [
    { id: 't4', project_id: 'p1', column_id: 'col-2', title: '看板拖拽交互实现', status: 'IN_PROGRESS', priority: 'HIGH', deadline: '2026-05-18T00:00:00Z', position: 0, version: 1, ai_generated: false, tags: [{ id: 'tg4', name: '前端', color: 'blue' }, { id: 'tg5', name: 'dnd-kit', color: 'teal' }], assignees: [{ id: 'a1', user_id: 'u1', name: '张', avatar: null }] },
    { id: 't5', project_id: 'p1', column_id: 'col-2', title: 'AI 命令面板 UI', status: 'IN_PROGRESS', priority: 'MEDIUM', deadline: '2026-06-01T00:00:00Z', position: 1, version: 1, ai_generated: true, tags: [{ id: 'tg6', name: 'AI', color: 'blue' }], assignees: [{ id: 'a2', user_id: 'u2', name: '李', avatar: null }] },
  ],
  'col-3': [
    { id: 't6', project_id: 'p1', column_id: 'col-3', title: '项目初始化脚手架', status: 'DONE', priority: 'LOW', deadline: '2026-05-05T00:00:00Z', position: 0, version: 1, ai_generated: false, tags: [{ id: 'tg7', name: '工程化', color: 'purple' }], assignees: [{ id: 'a1', user_id: 'u1', name: '张', avatar: null }] },
  ],
};

const MOCK_COLUMNS: BoardColumn[] = [
  { id: 'col-1', project_id: 'p1', name: '待办', status_mapping: 'TODO', position: 0, is_default: true, color: '#a39e98', tasks: MOCK_TASKS['col-1'] },
  { id: 'col-2', project_id: 'p1', name: '进行中', status_mapping: 'IN_PROGRESS', position: 1, is_default: true, color: '#0075de', tasks: MOCK_TASKS['col-2'] },
  { id: 'col-3', project_id: 'p1', name: '已完成', status_mapping: 'DONE', position: 2, is_default: true, color: '#1aae39', tasks: MOCK_TASKS['col-3'] },
];
/* ──── End mock ──── */

interface KanbanState {
  columns: BoardColumn[];
  myRole: ProjectRole | null;
  projectId: string | null;
  loading: boolean;

  loadBoard: (projectId: string) => Promise<void>;
  addColumn: (name: string, statusMapping: TaskStatus, color: string) => Promise<void>;
  removeColumn: (columnId: string, targetColumnId: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;
  moveTaskToColumn: (taskId: string, targetColumnId: string, targetStatus: TaskStatus) => Promise<void>;
  reorderTasksInColumn: (columnId: string) => Promise<void>;
  moveTaskLocally: (taskId: string, fromColumnId: string, toColumnId: string, toIndex: number) => void;
  reorderTasksLocally: (columnId: string, reorderedTasks: Task[]) => void;
  reorderColumnsLocally: (reorderedColumns: BoardColumn[]) => void;
  reset: () => void;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  columns: [],
  myRole: null,
  projectId: null,
  loading: false,

  loadBoard: async (projectId: string) => {
    set({ loading: true, projectId });
    try {
      if (USE_MOCK) {
        await new Promise((r) => setTimeout(r, 400));
        set({ columns: JSON.parse(JSON.stringify(MOCK_COLUMNS)), myRole: 'PROJECT_OWNER', loading: false });
        return;
      }
      const data = await kanbanApi.fetchBoard(projectId);
      set({ columns: data.columns, myRole: data.my_role, loading: false });
    } catch {
      message.error('加载看板失败');
      set({ loading: false });
    }
  },

  addColumn: async (name, statusMapping, color) => {
    const { projectId, columns } = get();
    if (!projectId) return;
    if (USE_MOCK) {
      const newCol: BoardColumn = {
        id: 'col-mock-' + Date.now(),
        project_id: projectId,
        name,
        status_mapping: statusMapping,
        position: columns.length,
        is_default: false,
        color,
        tasks: [],
      };
      set({ columns: [...columns, newCol] });
      return;
    }
    try {
      const col = await kanbanApi.createColumn(projectId, { name, status_mapping: statusMapping, color });
      set({ columns: [...columns, { ...col, tasks: [] }] });
    } catch {
      message.error('添加列失败');
    }
  },

  removeColumn: async (columnId, targetColumnId) => {
    const { columns } = get();
    if (USE_MOCK) {
      const targetCol = columns.find((c) => c.id === targetColumnId);
      const removedCol = columns.find((c) => c.id === columnId);
      if (targetCol && removedCol) {
        const merged = columns
          .filter((c) => c.id !== columnId)
          .map((c) => c.id === targetColumnId ? { ...c, tasks: [...c.tasks, ...removedCol.tasks] } : c);
        set({ columns: merged });
      }
      return;
    }
    try {
      await kanbanApi.deleteColumn(columnId, { target_column_id: targetColumnId });
      const targetCol = columns.find((c) => c.id === targetColumnId);
      const removedCol = columns.find((c) => c.id === columnId);
      const updated = columns
        .filter((c) => c.id !== columnId)
        .map((c) => {
          if (c.id === targetColumnId && targetCol && removedCol) {
            return { ...c, tasks: [...c.tasks, ...removedCol.tasks] };
          }
          return c;
        });
      set({ columns: updated });
    } catch {
      message.error('删除列失败');
    }
  },

  reorderColumns: async (columnIds) => {
    const { columns } = get();
    if (USE_MOCK) return;
    try {
      await kanbanApi.reorderColumns({
        column_orders: columnIds.map((id, i) => ({ id, position: i })),
      });
    } catch {
      message.error('排序失败');
      set({ columns });
    }
  },

  moveTaskToColumn: async (taskId, targetColumnId, targetStatus) => {
    if (USE_MOCK) return;
    try {
      await kanbanApi.updateTaskStatus(taskId, { status: targetStatus, column_id: targetColumnId });
    } catch {
      message.error('移动任务失败');
    }
  },

  reorderTasksInColumn: async (columnId) => {
    const col = get().columns.find((c) => c.id === columnId);
    if (!col || USE_MOCK) return;
    try {
      await kanbanApi.reorderTasks(columnId, {
        task_orders: col.tasks.map((t, i) => ({ task_id: t.id, position: i })),
      });
    } catch {
      message.error('排序失败');
    }
  },

  moveTaskLocally: (taskId, fromColumnId, toColumnId, toIndex) => {
    const { columns } = get();
    const updated = columns.map((col) => {
      if (col.id === fromColumnId) {
        const task = col.tasks.find((t) => t.id === taskId);
        if (!task) return col;
        return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
      }
      return col;
    }).map((col) => {
      if (col.id === toColumnId) {
        const fromCol = columns.find((c) => c.id === fromColumnId);
        const task = fromCol?.tasks.find((t) => t.id === taskId);
        if (!task) return col;
        const newTasks = [...col.tasks];
        newTasks.splice(toIndex, 0, { ...task, column_id: toColumnId });
        return { ...col, tasks: newTasks };
      }
      return col;
    });
    set({ columns: updated });
  },

  reorderTasksLocally: (columnId, reorderedTasks) => {
    set({
      columns: get().columns.map((col) =>
        col.id === columnId ? { ...col, tasks: reorderedTasks } : col
      ),
    });
  },

  reorderColumnsLocally: (reorderedColumns) => {
    set({ columns: reorderedColumns });
  },

  reset: () => set({ columns: [], myRole: null, projectId: null, loading: false }),
}));
