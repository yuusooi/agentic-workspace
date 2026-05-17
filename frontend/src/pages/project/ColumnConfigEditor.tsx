import { useState, useEffect } from 'react';
import { Input, Select, Button, ColorPicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const STATUS_OPTIONS = [
  { value: 'TODO', label: '待办' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'DONE', label: '已完成' },
];

const PRESET_COLORS = ['#0075de', '#1aae39', '#dd5b00', '#615d59', '#9c5ddf', '#e8590c', '#0ca678', '#a39e98'];

interface ColumnConfig {
  name: string;
  color: string;
  status_mapping: string;
}

interface ColumnConfigEditorProps {
  value?: ColumnConfig[];
  onChange?: (value: ColumnConfig[]) => void;
}

export default function ColumnConfigEditor({ value, onChange }: ColumnConfigEditorProps) {
  const [columns, setColumns] = useState<ColumnConfig[]>(value || []);

  useEffect(() => {
    if (value) setColumns(value);
  }, [value]);

  const update = (newCols: ColumnConfig[]) => {
    setColumns(newCols);
    onChange?.(newCols);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {columns.map((col, idx) => (
        <div key={idx} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Input
            value={col.name}
            onChange={(e) => {
              const updated = [...columns];
              updated[idx] = { ...updated[idx], name: e.target.value };
              update(updated);
            }}
            placeholder="列名"
            style={{ width: 120 }}
            size="small"
          />
          <ColorPicker
            size="small"
            value={col.color}
            onChange={(_, hex) => {
              const updated = [...columns];
              updated[idx] = { ...updated[idx], color: hex };
              update(updated);
            }}
            presets={[{ label: '预设', colors: PRESET_COLORS }]}
          />
          <Select
            value={col.status_mapping}
            onChange={(v) => {
              const updated = [...columns];
              updated[idx] = { ...updated[idx], status_mapping: v };
              update(updated);
            }}
            options={STATUS_OPTIONS}
            size="small"
            style={{ width: 100 }}
          />
          <DeleteOutlined
            onClick={() => update(columns.filter((_, i) => i !== idx))}
            style={{ color: '#a39e98', cursor: 'pointer' }}
          />
        </div>
      ))}
      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        onClick={() => update([...columns, { name: '', color: PRESET_COLORS[columns.length % PRESET_COLORS.length], status_mapping: 'TODO' }])}
        style={{ width: '100%', fontSize: 11 }}
      >
        添加列
      </Button>
    </div>
  );
}
