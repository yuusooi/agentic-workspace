import { create } from 'zustand';
import { message } from 'antd';
import type { BoardColumn, ProjectRole, TaskStatus, KanbanTask } from '@/types/kanban';
import * as kanbanApi from '@/lib/kanban-api';
import { getTasks } from '@/lib/task-api';
import { useProjectStore } from './project-store';

interface KanbanState {
  columns: BoardColumn[];
  myRole: ProjectRole | null;
  projectId: string | null;
  loading: boolean;

  loadBoard: (projectId: string) => Promise<void>;
  addColumn: (name: string, statusMapping: TaskStatus, color: string) => Promise<void>;
  removeColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;
  moveTaskToColumn: (taskId: string, targetColumnId: string, targetStatus: TaskStatus) => Promise<void>;
  reorderTasksInColumn: (columnId: string) => Promise<void>;
  moveTaskLocally: (taskId: string, fromColumnId: string, toColumnId: string, toIndex: number) => void;
  reorderTasksLocally: (columnId: string, reorderedTasks: KanbanTask[]) => void;
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
      const project = useProjectStore.getState().currentProject;
      const myRole = project?.myRole || null;
      const columns = await kanbanApi.fetchBoard(projectId);
      const tasksRes = await getTasks({ projectId, size: 200 });
      const tasks: KanbanTask[] = (tasksRes.content || []).map((t: any) => ({
        id: String(t.id),
        projectId: String(t.projectId),
        columnId: String(t.columnId),
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        sortOrder: t.sortOrder || 0,
        version: t.version || 0,
        assignees: (t.assignees || []).map((a: any) => ({
          userId: String(a.userId),
          nickname: a.nickname,
          avatar: a.avatar,
        })),
        tags: (t.tags || []).map((tag: any) => ({
          id: String(tag.id),
          name: tag.name,
          color: tag.color,
        })),
      }));

      const columnsWithTasks: BoardColumn[] = (columns || []).map((col: any) => ({
        id: String(col.id),
        name: col.name,
        sortOrder: col.sortOrder,
        statusMapping: col.statusMapping,
        createdAt: col.createdAt,
        tasks: tasks
          .filter((t) => t.columnId === String(col.id))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      }));

      set({ columns: columnsWithTasks, myRole, loading: false });
    } catch {
      message.error('加载看板失败');
      set({ loading: false });
    }
  },

  addColumn: async (name, statusMapping, _color) => {
    const { projectId, columns } = get();
    if (!projectId) return;
    try {
      const col = await kanbanApi.createColumn(projectId, { name, statusMapping });
      set({ columns: [...columns, { ...col, tasks: [] }] });
    } catch {
      message.error('添加列失败');
    }
  },

  removeColumn: async (columnId) => {
    try {
      await kanbanApi.deleteColumn(columnId);
      const { columns } = get();
      set({ columns: columns.filter((c) => c.id !== columnId) });
    } catch {
      message.error('删除列失败');
    }
  },

  reorderColumns: async (columnIds) => {
    const { columns, projectId } = get();
    if (!projectId) return;
    try {
      await kanbanApi.sortColumns(projectId, {
        columns: columnIds.map((id, i) => ({ columnId: id, sortOrder: i })),
      });
    } catch {
      message.error('排序失败');
      set({ columns });
    }
  },

  moveTaskToColumn: async (taskId, targetColumnId, targetStatus) => {
    try {
      await kanbanApi.updateTaskStatus(taskId, { columnId: targetColumnId, status: targetStatus });
    } catch {
      message.error('移动任务失败');
    }
  },

  reorderTasksInColumn: async (columnId) => {
    const col = get().columns.find((c) => c.id === columnId);
    if (!col) return;
    try {
      await kanbanApi.sortTasksInColumn(columnId, col.tasks.map((t) => t.id));
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
        newTasks.splice(toIndex, 0, { ...task, columnId: toColumnId });
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
