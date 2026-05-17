import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@/types/kanban';

const TAG_COLORS = ['tag-blue', 'tag-green', 'tag-red', 'tag-purple', 'tag-teal'] as const;

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#a39e98',
  MEDIUM: '#615d59',
  HIGH: '#0075de',
  URGENT: '#dd5b00',
};

const AVATAR_COLORS = ['#31302e', '#0075de', '#615d59', '#1aae39', '#a39e98'];

interface TaskCardProps {
  task: Task;
  tagIndex: number;
  onClick?: (task: Task) => void;
}

export default function TaskCard({ task, tagIndex, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task' as const, task, sourceColumnId: task.column_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue =
    task.deadline &&
    new Date(task.deadline) < new Date() &&
    task.status !== 'DONE';

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="drag-placeholder" />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`k-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging && onClick) {
          e.stopPropagation();
          onClick(task);
        }
      }}
    >
      <div className="k-card-t">{task.title}</div>
      {task.tags.length > 0 && (
        <div className="k-card-tags">
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className={`tag ${TAG_COLORS[tagIndex % TAG_COLORS.length]}`}
            >
              {tag.name}
            </span>
          ))}
          {task.ai_generated && <span className="tag-ai">AI</span>}
        </div>
      )}
      <div className="k-card-ft">
        <div className="k-card-meta">
          <span
            className="k-card-pri"
            style={{ background: PRIORITY_COLORS[task.priority] || '#a39e98' }}
          />
          {task.deadline && (
            <span className={`k-card-dl ${isOverdue ? 'od' : ''}`}>
              {formatDate(task.deadline)}
            </span>
          )}
        </div>
        {task.assignees.length > 0 && (
          <div style={{ display: 'flex' }}>
            {task.assignees.map((a, i) => (
              <span
                key={a.id}
                className="mini-av"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {a.name[0]}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
