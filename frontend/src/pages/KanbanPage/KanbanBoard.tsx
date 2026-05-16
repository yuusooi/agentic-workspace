import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { PlusOutlined } from '@ant-design/icons';
import type { BoardColumn } from '@/types/kanban';
import KanbanColumn from './KanbanColumn';
import { useKanbanStore } from '@/stores/kanban-store';

interface KanbanBoardProps {
  columns: BoardColumn[];
  onDeleteColumn: (column: BoardColumn) => void;
  onAddColumn: () => void;
}

export default function KanbanBoard({ columns, onDeleteColumn, onAddColumn }: KanbanBoardProps) {
  const canManage = useKanbanStore((s) => s.myRole) === 'PROJECT_OWNER';
  const columnIds = columns.map((c) => c.id);

  return (
    <div className="kanban">
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        {columns.map((col, idx) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tagIndex={idx}
            onDeleteColumn={onDeleteColumn}
          />
        ))}
      </SortableContext>
      {canManage && (
        <div className="k-add-col" onClick={onAddColumn}>
          <PlusOutlined /> 添加列
        </div>
      )}
    </div>
  );
}
