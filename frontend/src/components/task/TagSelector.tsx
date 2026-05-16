import { useState } from 'react';
import { Select, Tag as AntTag, Input, ColorPicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Tag as TagType } from '@/lib/task-api';

const TAG_COLORS = [
  '#0075de', '#1aae39', '#dd5b00', '#615d59',
  '#9c5ddf', '#e8590c', '#0ca678', '#a39e98',
];

interface TagSelectorProps {
  tags: TagType[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string, color: string) => Promise<TagType | void>;
  loading?: boolean;
}

export default function TagSelector({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  loading,
}: TagSelectorProps) {
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const handleCreate = async () => {
    if (!newTagName.trim() || !onCreateTag) return;
    setCreating(true);
    try {
      const tag = await onCreateTag(newTagName.trim(), newTagColor);
      if (tag) {
        onChange([...selectedTagIds, tag.id]);
      }
      setNewTagName('');
    } finally {
      setCreating(false);
    }
  };

  const tagRender = (props: { value: string; closable: boolean; onClose: () => void }) => {
    const { value, closable, onClose } = props;
    const tag = tags.find((t) => t.id === value);
    if (!tag) return <span />;
    return (
      <AntTag
        closable={closable}
        onClose={onClose}
        style={{
          marginInlineEnd: 4,
          background: hexToRgba(tag.color, 0.08),
          borderColor: hexToRgba(tag.color, 0.2),
          color: tag.color,
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {tag.name}
      </AntTag>
    );
  };

  return (
    <Select
      mode="multiple"
      value={selectedTagIds}
      onChange={onChange}
      loading={loading}
      tagRender={tagRender}
      placeholder="选择标签"
      style={{ width: '100%' }}
      maxCount={10}
      options={tags.map((t) => ({
        value: t.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: t.color,
                flexShrink: 0,
              }}
            />
            {t.name}
          </div>
        ),
      }))}
      dropdownRender={(menu) => (
        <div>
          {menu}
          {onCreateTag && (
            <div style={{ padding: '4px 8px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
              {creating ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ColorPicker
                    size="small"
                    value={newTagColor}
                    onChange={(_, hex) => setNewTagColor(hex)}
                    presets={[{ label: '预设', colors: TAG_COLORS }]}
                  />
                  <Input
                    size="small"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="标签名称"
                    maxLength={20}
                    style={{ flex: 1 }}
                    onPressEnter={handleCreate}
                    autoFocus
                  />
                  <PlusOutlined
                    style={{ color: '#0075de', cursor: creating ? 'not-allowed' : 'pointer', fontSize: 12 }}
                    onClick={handleCreate}
                  />
                </div>
              ) : (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#0075de', padding: '4px 0', fontSize: 13 }}
                  onClick={() => setCreating(true)}
                >
                  <PlusOutlined /> 新建标签
                </div>
              )}
            </div>
          )}
        </div>
      )}
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
