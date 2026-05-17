import { Dropdown, MenuProps } from 'antd';
import { HolderOutlined, MoreOutlined } from '@ant-design/icons';
import type { BoardColumn } from '@/types/kanban';
import { useKanbanStore } from '@/stores/kanban-store';
import { useProjectStore, isProjectOwner } from '@/stores/project-store';
import { useAuthStore } from '@/stores/auth-store';

interface KanbanColumnHeaderProps {
  column: BoardColumn;
  onDeleteClick: (column: BoardColumn) => void;
  onAddTask?: () => void;
}

export default function KanbanColumnHeader({
  column,
  onDeleteClick,
}: KanbanColumnHeaderProps) {
  const myRole = useKanbanStore((s) => s.myRole);
  const currentProject = useProjectStore((s) => s.currentProject);
  const user = useAuthStore((s) => s.user);
  const canManage = myRole === 'PROJECT_OWNER' || user?.role === 'ADMIN' || isProjectOwner(currentProject);

  const menuItems: MenuProps['items'] = [];

  if (canManage && !column.is_default) {
    menuItems.push({
      key: 'delete',
      label: '删除列',
      danger: true,
      onClick: () => onDeleteClick(column),
    });
  }

  return (
    <div className="k-col-h">
      <span className="k-col-handle">
        <HolderOutlined style={{ fontSize: 12 }} />
      </span>
      <span className="k-dot" style={{ background: column.color }} />
      <span className="k-col-t">{column.name}</span>
      <span className="k-col-c">{column.tasks.length}</span>
      {menuItems.length > 0 && (
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <button className="k-col-menu-btn" onClick={(e) => e.stopPropagation()}>
            <MoreOutlined />
          </button>
        </Dropdown>
      )}
    </div>
  );
}
