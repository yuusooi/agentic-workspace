import { useState } from 'react';
import { Button, Tag, message } from 'antd';
import { TagOutlined, CheckOutlined, ThunderboltOutlined } from '@ant-design/icons';
import * as aiApi from '@/lib/ai-api';

interface AISuggestTagsProps {
  taskId: string;
  onAdopt?: (tags: string[]) => void;
  disabled?: boolean;
}

export default function AISuggestTags({ taskId, onAdopt, disabled }: AISuggestTagsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ name: string; confidence: number }[]>([]);

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const res = await aiApi.suggestTags({ task_id: taskId });
      setSuggestions(res.suggested_tags);
    } catch {
      message.error('获取推荐失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdopt = () => {
    onAdopt?.(suggestions.map((s) => s.name));
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
        AI 推荐标签
      </Button>
      {suggestions.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {suggestions.map((s, i) => (
            <Tag key={i} style={{ borderRadius: 9999, fontSize: 11, margin: 0 }}>
              <TagOutlined style={{ marginRight: 2 }} />
              {s.name}
              <span style={{ color: '#a39e98', marginLeft: 4, fontSize: 10 }}>
                {Math.round(s.confidence * 100)}%
              </span>
            </Tag>
          ))}
          <Button
            size="small"
            type="link"
            icon={<CheckOutlined />}
            onClick={handleAdopt}
            style={{ fontSize: 11, padding: 0 }}
          >
            采纳
          </Button>
        </div>
      )}
    </div>
  );
}
