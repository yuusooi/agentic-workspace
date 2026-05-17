import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { BoardColumn, Task } from '@/types/kanban';
import TaskCard from './TaskCard';
import KanbanColumnHeader from './KanbanColumnHeader';

interface KanbanColumnProps {
  column: BoardColumn;
  tagIndex: number;
  onDeleteColumn: (column: BoardColumn) => void;
  onTaskClick?: (task: Task) => void;
}

export default function KanbanColumn({ column, tagIndex, onDeleteColumn, onTaskClick }: KanbanColumnProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column' as const, column },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.id + '-droppable',
    data: { type: 'column' as const, column },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`k-col ${isOver ? 'drag-over' : ''}`}
    >
      <div {...attributes} {...listeners}>
        <KanbanColumnHeader
          column={column}
          onDeleteClick={onDeleteColumn}
        />
      </div>
      <div ref={setDroppableRef} className="k-col-b">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} tagIndex={tagIndex} onClick={onTaskClick} />
          ))}
        </SortableContext>
        {column.tasks.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#a39e98',
              fontSize: 12,
              padding: '16px 0',
            }}
          >
            拖拽任务到此处
          </div>
        )}
      </div>
    </div>
  );
}
