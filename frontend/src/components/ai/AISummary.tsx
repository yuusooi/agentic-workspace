import { useState } from 'react';
import { Button, message } from 'antd';
import { ThunderboltOutlined, FileTextOutlined } from '@ant-design/icons';
import * as aiApi from '@/lib/ai-api';

interface AISummaryProps {
  taskId: string;
  onGenerated?: (summary: string) => void;
  disabled?: boolean;
}

export default function AISummary({ taskId, onGenerated, disabled }: AISummaryProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await aiApi.generateSummary({ task_id: taskId });
      setSummary(res.summary);
      onGenerated?.(res.summary);
    } catch {
      message.error('生成摘要失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        size="small"
        icon={<ThunderboltOutlined />}
        onClick={handleGenerate}
        loading={loading}
        disabled={disabled}
        style={{ fontSize: 12, color: '#0075de' }}
      >
        AI 生成摘要
      </Button>
      {summary && (
        <div style={{
          marginTop: 6,
          padding: '8px 10px',
          background: '#f2f9ff',
          border: '1px solid rgba(0,117,222,.1)',
          borderRadius: 6,
          fontSize: 12,
          color: '#615d59',
          lineHeight: 1.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <FileTextOutlined style={{ color: '#0075de', fontSize: 11 }} />
            <span style={{ fontWeight: 500, color: '#0075de', fontSize: 11 }}>AI 摘要</span>
          </div>
          {summary}
        </div>
      )}
    </div>
  );
}
