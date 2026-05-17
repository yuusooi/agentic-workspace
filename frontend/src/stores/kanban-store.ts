import { create } from 'zustand';
import { message } from 'antd';
import type { BoardColumn, ProjectRole, TaskStatus, Task } from '@/types/kanban';
import * as kanbanApi from '@/lib/kanban-api';

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
    try {
      const col = await kanbanApi.createColumn(projectId, { name, status_mapping: statusMapping, color });
      set({ columns: [...columns, { ...col, tasks: [] }] });
    } catch {
      message.error('添加列失败');
    }
  },

  removeColumn: async (columnId, targetColumnId) => {
    const { columns } = get();
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
    try {
      await kanbanApi.updateTaskStatus(taskId, { status: targetStatus, column_id: targetColumnId });
    } catch {
      message.error('移动任务失败');
    }
  },

  reorderTasksInColumn: async (columnId) => {
    const col = get().columns.find((c) => c.id === columnId);
    if (!col) return;
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
