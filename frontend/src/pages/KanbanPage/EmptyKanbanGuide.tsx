import { Button } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';

interface EmptyKanbanGuideProps {
  hasColumns: boolean;
  onAddColumn: () => void;
}

export default function EmptyKanbanGuide({ hasColumns, onAddColumn }: EmptyKanbanGuideProps) {
  if (!hasColumns) {
    return (
      <div className="kanban-empty">
        <div className="kanban-empty-title">看板为空</div>
        <p className="kanban-empty-desc">
          此项目还没有看板列，创建第一列来开始管理任务
        </p>
        <Button
          type="primary"
          icon={<PlusCircleOutlined />}
          onClick={onAddColumn}
        >
          创建看板列
        </Button>
      </div>
    );
  }

  return null;
}
