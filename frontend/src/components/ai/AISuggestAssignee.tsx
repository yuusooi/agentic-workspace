import { useState } from 'react';
import { Button, Avatar, message } from 'antd';
import { CheckOutlined, ThunderboltOutlined } from '@ant-design/icons';
import * as aiApi from '@/lib/ai-api';

interface AISuggestAssigneeProps {
  taskId: string;
  onAdopt?: (userId: string) => void;
  disabled?: boolean;
}

export default function AISuggestAssignee({ taskId, onAdopt, disabled }: AISuggestAssigneeProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    user_id: string;
    name: string;
    reason: string;
  }[]>([]);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const res = await aiApi.suggestAssignee({ task_id: taskId });
      setSuggestions(res.suggested_assignee);
    } catch {
      message.error('获取推荐失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdopt = (userId: string) => {
    onAdopt?.(userId);
    setSuggestions([]);
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
        AI 推荐负责人
      </Button>
      {suggestions.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {suggestions.map((s) => (
            <div
              key={s.user_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                background: '#f6f5f4',
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <Avatar size={20} style={{ backgroundColor: '#31302e', fontSize: 9 }}>
                {s.name[0]}
              </Avatar>
              <span style={{ fontWeight: 500 }}>{s.name}</span>
              <span style={{ flex: 1, color: '#615d59', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.reason}
              </span>
              <Button
                size="small"
                type="link"
                icon={<CheckOutlined />}
                onClick={() => handleAdopt(s.user_id)}
                style={{ fontSize: 10, padding: 0 }}
              >
                采纳
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
