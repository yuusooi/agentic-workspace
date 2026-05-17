import { useState } from 'react';
import { Button, message } from 'antd';
import { CheckOutlined, ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import * as aiApi from '@/lib/ai-api';

interface AISuggestEffortProps {
  taskId: string;
  onAdopt?: (hours: number) => void;
  disabled?: boolean;
}

export default function AISuggestEffort({ taskId, onAdopt, disabled }: AISuggestEffortProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ min: number; max: number; reason: string } | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const res = await aiApi.suggestEffort({ task_id: taskId });
      setResult(res.estimated_hours);
    } catch {
      message.error('获取预估失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdopt = () => {
    if (result) {
      onAdopt?.(result.max);
      setResult(null);
    }
  };

  return (
    <div>
      <Button
        size="small"
        icon={<ThunderboltOutlined />}
        onClick={handleSuggest}
        loading={loading}
        disabled={disabled}
        style={{ fontSize: 12, color: '#0075de' }}
      >
        AI 预估工时
      </Button>
      {result && (
        <div style={{
          marginTop: 6,
          padding: '6px 10px',
          background: '#f6f5f4',
          borderRadius: 6,
          fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <ClockCircleOutlined style={{ color: '#0075de' }} />
            <span style={{ fontWeight: 500 }}>{result.min}h ~ {result.max}h</span>
          </div>
          {result.reason && (
            <div style={{ color: '#615d59', fontSize: 11, lineHeight: 1.4 }}>{result.reason}</div>
          )}
          <Button
            size="small"
            type="link"
            icon={<CheckOutlined />}
            onClick={handleAdopt}
            style={{ fontSize: 11, padding: 0, marginTop: 2 }}
          >
            采纳
          </Button>
        </div>
      )}
    </div>
  );
}
