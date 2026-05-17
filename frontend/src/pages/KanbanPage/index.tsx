import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Button, message } from 'antd';
import { ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { useKanbanStore } from '@/stores/kanban-store';
import { useTaskStore } from '@/stores/task-store';
import * as taskApi from '@/lib/task-api';
import KanbanBoard from './KanbanBoard';
import EmptyKanbanGuide from './EmptyKanbanGuide';
import AddColumnModal from './AddColumnModal';
import DeleteColumnModal from './DeleteColumnModal';
import MemberDrawer from '@/components/member/MemberDrawer';
import MemberTaskFilter from '@/components/member/MemberTaskFilter';
import TaskDrawer from '@/components/task/TaskDrawer';
import type { BoardColumn, Task } from '@/types/kanban';
import './KanbanPage.css';

export default function KanbanPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const columns = useKanbanStore((s) => s.columns);
  const myRole = useKanbanStore((s) => s.myRole);
  const loading = useKanbanStore((s) => s.loading);
  const loadBoard = useKanbanStore((s) => s.loadBoard);
  const moveTaskLocally = useKanbanStore((s) => s.moveTaskLocally);
  const reorderColumnsLocally = useKanbanStore((s) => s.reorderColumnsLocally);
  const reorderColumns = useKanbanStore((s) => s.reorderColumns);
  const moveTaskToColumn = useKanbanStore((s) => s.moveTaskToColumn);
  const reorderTasksInColumn = useKanbanStore((s) => s.reorderTasksInColumn);
  const reset = useKanbanStore((s) => s.reset);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteColumn, setDeleteColumn] = useState<BoardColumn | null>(null);
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [filteredMemberId, setFilteredMemberId] = useState<string | null>(null);
  const [filteredMemberName, setFilteredMemberName] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) loadBoard(projectId);
    return () => { reset(); };
  }, [projectId, loadBoard, reset]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findColumn = useCallback(
    (id: string): BoardColumn | undefined =>
      columns.find((c) => c.id === id || c.tasks.some((t) => t.id === id)),
    [columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'task') {
      setActiveTask(data.task as Task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || activeData.type !== 'task') return;

    const activeId = active.id as string;
    const sourceColumnId = activeData.sourceColumnId as string;

    let targetColumnId: string | undefined;
    let targetIndex = 0;

    if (overData?.type === 'column') {
      targetColumnId = overData.column.id;
      targetIndex = overData.column.tasks.length;
    } else if (overData?.type === 'task') {
      const overColumn = findColumn(over.id as string);
      targetColumnId = overColumn?.id;
      if (overColumn) {
        const overTaskIndex = overColumn.tasks.findIndex((t: Task) => t.id === over.id);
        targetIndex = overTaskIndex >= 0 ? overTaskIndex : overColumn.tasks.length;
      }
    } else {
      targetColumnId = over.id as string;
    }

    if (!targetColumnId || sourceColumnId === targetColumnId) return;

    moveTaskLocally(activeId, sourceColumnId, targetColumnId, targetIndex);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !active.data.current) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData.type === 'column' && overData?.type === 'column') {
      if (active.id !== over.id) {
        const oldIndex = columns.findIndex((c) => c.id === active.id);
        const newIndex = columns.findIndex((c) => c.id === over.id);
        const reordered = arrayMove(columns, oldIndex, newIndex);
        reorderColumnsLocally(reordered);
        reorderColumns(reordered.map((c) => c.id));
      }
      return;
    }

    if (activeData.type === 'task') {
      const taskId = active.id as string;
      const sourceColumnId = activeData.sourceColumnId as string;

      let targetColumn: BoardColumn | undefined;
      if (overData?.type === 'column') {
        targetColumn = overData.column;
      } else if (overData?.type === 'task') {
        targetColumn = findColumn(over.id as string);
      } else {
        targetColumn = findColumn(over.id as string);
      }

      if (!targetColumn) return;

      if (sourceColumnId === targetColumn.id) {
        const col = columns.find((c) => c.id === sourceColumnId);
        if (!col) return;
        const oldIdx = col.tasks.findIndex((t) => t.id === taskId);
        const overIdx = col.tasks.findIndex((t) => t.id === over.id);
        if (oldIdx !== overIdx && overIdx >= 0) {
          const reordered = arrayMove(col.tasks, oldIdx, overIdx);
          useKanbanStore.getState().reorderTasksLocally(sourceColumnId, reordered);
          reorderTasksInColumn(sourceColumnId);
        }
        return;
      }

      moveTaskToColumn(taskId, targetColumn.id, targetColumn.status_mapping);
    }
  };

  const handleMemberClick = (userId: string) => {
    const allTasks = columns.flatMap((c) => c.tasks);
    const member = allTasks
      .flatMap((t) => t.assignees)
      .find((a) => a.user_id === userId);
    setFilteredMemberId(userId);
    setFilteredMemberName(member?.name || null);
    setMemberDrawerOpen(false);
  };

  const handleTaskClick = async (task: Task) => {
    try {
      const detail = await taskApi.getTaskDetail(task.id);
      useTaskStore.getState().openDrawer('view', detail);
    } catch {
      message.error('加载任务详情失败');
    }
  };

  const getFilteredColumns = () => {
    if (!filteredMemberId) return columns;
    return columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) =>
        t.assignees.some((a) => a.userId === filteredMemberId),
      ),
    }));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const displayColumns = getFilteredColumns();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="kanban-toolbar">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/projects/${projectId}`)}
        >
          返回
        </Button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>看板</span>
        <div style={{ flex: 1 }} />
        <MemberTaskFilter
          filteredUserId={filteredMemberId}
          filteredUserName={filteredMemberName}
          onClear={() => {
            setFilteredMemberId(null);
            setFilteredMemberName(null);
          }}
        />
        <Button
          type="text"
          icon={<TeamOutlined />}
          onClick={() => setMemberDrawerOpen(true)}
          style={{ color: '#615d59' }}
        >
          成员
        </Button>
      </div>

      {columns.length === 0 ? (
        <EmptyKanbanGuide hasColumns={false} onAddColumn={() => setAddModalOpen(true)} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <KanbanBoard
            columns={displayColumns}
            onDeleteColumn={setDeleteColumn}
            onAddColumn={() => setAddModalOpen(true)}
            onTaskClick={handleTaskClick}
          />
          <DragOverlay>
            {activeTask && (
              <div
                className="k-card"
                style={{
                  width: 256,
                  boxShadow: '0 8px 24px rgba(0,0,0,.15)',
                  transform: 'rotate(1deg)',
                }}
              >
                <div className="k-card-t">{activeTask.title}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <AddColumnModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <DeleteColumnModal
        open={!!deleteColumn}
        column={deleteColumn}
        onClose={() => setDeleteColumn(null)}
      />
      {projectId && (
        <MemberDrawer
          open={memberDrawerOpen}
          onClose={() => setMemberDrawerOpen(false)}
          projectId={projectId}
          myRole={myRole}
          onMemberClick={handleMemberClick}
        />
      )}
      <TaskDrawer />
    </div>
  );
}
