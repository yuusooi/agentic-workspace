import { Input, Select, Button } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { useTaskStore } from '@/stores/task-store';
import { statusConfig, priorityConfig } from '@/lib/task-api';
import type { TaskStatus, TaskPriority } from '@/lib/task-api';

interface TaskFilterBarProps {
  projectId: string;
}

export default function TaskFilterBar({ projectId: _projectId }: TaskFilterBarProps) {
  const filter = useTaskStore((s) => s.filter);
  const setFilter = useTaskStore((s) => s.setFilter);
  const resetFilter = useTaskStore((s) => s.resetFilter);

  const hasFilter = filter.status || filter.priority || filter.keyword;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 0',
      flexWrap: 'wrap',
    }}>
      <Input
        placeholder="搜索任务..."
        prefix={<SearchOutlined style={{ color: '#a39e98' }} />}
        value={filter.keyword || ''}
        onChange={(e) => setFilter({ keyword: e.target.value || undefined })}
        style={{ width: 200 }}
        allowClear
        size="middle"
      />
      <Select
        placeholder="状态"
        value={filter.status || undefined}
        onChange={(v: TaskStatus) => setFilter({ status: v })}
        allowClear
        style={{ width: 120 }}
        options={Object.entries(statusConfig).map(([k, v]) => ({
          value: k,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.color }} />
              {v.label}
            </div>
          ),
        }))}
      />
      <Select
        placeholder="优先级"
        value={filter.priority || undefined}
        onChange={(v: TaskPriority) => setFilter({ priority: v })}
        allowClear
        style={{ width: 120 }}
        options={Object.entries(priorityConfig).map(([k, v]) => ({
          value: k,
          label: v.label,
        }))}
      />
      {hasFilter && (
        <Button
          type="text"
          icon={<ClearOutlined />}
          onClick={resetFilter}
          size="small"
          style={{ color: '#a39e98', fontSize: 12 }}
        >
          清除筛选
        </Button>
      )}
    </div>
  );
}
